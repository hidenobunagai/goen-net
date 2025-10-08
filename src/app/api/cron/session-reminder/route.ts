import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { NextRequest, NextResponse } from "next/server";

import { generateSessionReminderEmail } from "@/components/emails/session-reminder";
import { logger } from "@/lib/logger";
import { getAllowedEmails, sendEmail } from "@/lib/resend";
import { getNextSession, isTursoConfigured } from "@/lib/turso";

// Vercel Cronからのリクエストを検証
function isValidCronRequest(request: NextRequest): boolean {
  // Vercel Cronの場合、Authorization headerに "Bearer [CRON_SECRET]" が設定される
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // CRON_SECRETが設定されていない場合は、開発環境として扱う
    logger.warn("CRON_SECRET is not set. Allowing request for development.");
    return true;
  }

  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace("Bearer ", "");
  return token === cronSecret;
}

export async function GET(request: NextRequest) {
  // Cron認証チェック
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // データベースが設定されているか確認
    if (!isTursoConfigured()) {
      logger.info("Turso is not configured. Skipping reminder.");
      return NextResponse.json({
        success: false,
        message: "Database not configured",
      });
    }

    // Next Sessionを取得
    const nextSession = await getNextSession();

    if (!nextSession || !nextSession.startAt) {
      logger.info("No upcoming session found or start time not set.");
      return NextResponse.json({
        success: false,
        message: "No upcoming session scheduled",
      });
    }

    // セッションの日時を解析
    const sessionDate = parseISO(nextSession.startAt);
    const now = new Date();
    const daysUntil = Math.floor((sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // 3日前でない場合はスキップ
    if (daysUntil !== 3) {
      logger.info(`Session is ${daysUntil} days away. Reminder is only sent 3 days before.`, {
        daysUntil,
      });
      return NextResponse.json({
        success: false,
        message: `Not the right time for reminder. Days until session: ${daysUntil}`,
      });
    }

    // メール送信先を取得
    const recipients = getAllowedEmails();

    if (recipients.length === 0) {
      logger.warn("No recipients found in ALLOWED_EMAILS.");
      return NextResponse.json({
        success: false,
        message: "No recipients configured",
      });
    }

    // メール情報を準備
    const formattedDate = format(sessionDate, "yyyy年M月d日（E）", { locale: ja });
    const formattedTime = format(sessionDate, "HH:mm", { locale: ja });

    // メールHTMLを生成
    const emailHtml = generateSessionReminderEmail({
      sessionDate: formattedDate,
      sessionTime: formattedTime,
      location: nextSession.location,
      daysUntil: 3,
    });

    // 各受信者にメールを送信
    const sendPromises = recipients.map(async (email) => {
      try {
        const result = await sendEmail({
          from: process.env.RESEND_FROM_EMAIL || "Goen Net <onboarding@resend.dev>",
          to: email,
          subject: `🗓️ リマインダー: Goen Net Sessionが3日後です`,
          html: emailHtml,
        });
        logger.info("Email sent successfully", { email, result });
        return { email, success: true, result };
      } catch (error) {
        logger.error("Failed to send email", { email, error });
        return { email, success: false, error: String(error) };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${successCount}/${recipients.length} recipients`,
      sessionDate: formattedDate,
      sessionTime: formattedTime,
      results,
    });
  } catch (error) {
    logger.error("Error in session reminder cron", { error });
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
