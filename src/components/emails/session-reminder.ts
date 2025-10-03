interface SessionReminderEmailProps {
  sessionDate: string;
  sessionTime: string;
  location?: string | null;
  daysUntil: number;
}

export function generateSessionReminderEmail({
  sessionDate,
  sessionTime,
  location,
  daysUntil,
}: SessionReminderEmailProps): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://goen-net.vercel.app";
  
  const locationRow = location
    ? `
    <tr>
      <td style="font-size: 14px; color: #64748b; padding-right: 15px; padding-bottom: 10px; vertical-align: top; width: 30%;">📍 場所:</td>
      <td style="font-size: 16px; color: #1f2937; font-weight: 500; padding-bottom: 10px;">${location}</td>
    </tr>
    `
    : '';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Goen Net - Session Reminder</title>
      </head>
      <body style="background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background-color: #0f172a; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0;">🗓️ Goen Net Session Reminder</h1>
          </div>
          
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #1f2937; margin-bottom: 10px;">こんにちは、</p>
            
            <p style="font-size: 18px; color: #1f2937; line-height: 1.6; margin-bottom: 30px;">
              次回のGoen Net Sessionが<strong>${daysUntil}日後</strong>に予定されています。
            </p>
            
            <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid #e2e8f0;">
              <h2 style="font-size: 18px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 15px;">セッション詳細</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="font-size: 14px; color: #64748b; padding-right: 15px; padding-bottom: 10px; vertical-align: top; width: 30%;">📅 日付:</td>
                    <td style="font-size: 16px; color: #1f2937; font-weight: 500; padding-bottom: 10px;">${sessionDate}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 14px; color: #64748b; padding-right: 15px; padding-bottom: 10px; vertical-align: top;">🕐 時刻:</td>
                    <td style="font-size: 16px; color: #1f2937; font-weight: 500; padding-bottom: 10px;">${sessionTime}</td>
                  </tr>
                  ${locationRow}
                </tbody>
              </table>
            </div>
            
            <p style="font-size: 16px; color: #1f2937; margin-bottom: 15px;">
              当日までに以下の準備をお願いします：
            </p>
            <ul style="font-size: 15px; color: #475569; line-height: 1.8; margin-bottom: 30px; padding-left: 20px;">
              <li>最新のアップデートをGoen Netに投稿</li>
              <li>前回のアクションアイテムの進捗確認</li>
              <li>ディスカッションしたいトピックの整理</li>
            </ul>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${appUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600;">
                Goen Netにアクセス
              </a>
            </div>
            
            <p style="font-size: 14px; color: #64748b; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              お会いできることを楽しみにしています！<br />
              <em>Goen Net Team</em>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}
