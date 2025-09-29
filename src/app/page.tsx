import { NextSessionCard } from "@/app/(protected)/_components/next-session-card";
import { getOptionalUserSession } from "@/lib/session";
import { getNextSession } from "@/lib/turso";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Unstable_Grid2";
import Link from "next/link";

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  const session = await getOptionalUserSession();

  if (!session) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Stack spacing={4} alignItems="center">
          <Typography variant="h4">
            Please sign in to access Goen Net
          </Typography>
          <Button
            component={Link}
            href="/signin"
            variant="contained"
            size="large"
          >
            Sign In
          </Button>
        </Stack>
      </Container>
    );
  }

  const [nextSession] = await Promise.all([getNextSession()]);
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] ?? "Member";

  return (
    <Box sx={{ bgcolor: "#FFFFFF", minHeight: "100vh" }}>
      <Container maxWidth="lg" sx={{ py: { xs: 6, sm: 8, md: 12 } }}>
        <Stack spacing={{ xs: 6, md: 8 }}>
          {/* Hero Section */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                letterSpacing: "0.1em",
                fontSize: "0.875rem",
                display: "block",
                mb: 2,
              }}
            >
              DASHBOARD
            </Typography>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 700,
                fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" },
                color: "primary.main",
                mb: 2,
                lineHeight: 1.2,
              }}
            >
              {firstName}さんのダッシュボード
            </Typography>
            <Typography 
              variant="body1" 
              sx={{
                color: "text.secondary",
                fontSize: { xs: "1rem", md: "1.125rem" },
                lineHeight: 1.8,
                maxWidth: "720px",
              }}
            >
              コホートとつながり、次回セッションの準備をしましょう。
            </Typography>
          </Box>

          {/* Next Session Card */}
          <Card sx={{ maxWidth: 600 }}>
            <NextSessionCard initial={nextSession} />
          </Card>

          <Divider />

          {/* Workspace at a glance */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 600,
                letterSpacing: "0.1em",
                fontSize: "0.875rem",
                display: "block",
                mb: 2,
              }}
            >
              WORKSPACE
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                mb: 3,
                color: "text.primary"
              }}
            >
              プライベートな円卓の場
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: "text.secondary",
                mb: 4,
                maxWidth: "720px"
              }}
            >
              このサイトは、Goen Netセッションの準備、実施、フォローアップを効率的に行うための専用ツールです。
            </Typography>
            <Grid container spacing={3}>
              <Grid xs={12} sm={6} md={4}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    更新情報の共有
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ハイライトを記録し、期間をタグ付けし、投票して、ファシリテーターがすぐに状況を把握できるようにします。
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={12} sm={6} md={4}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    アジェンダの共同作成
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    優先順位付けを使用して、セッション前に深い議論が必要なトピックを明確にします。
                  </Typography>
                </Box>
              </Grid>
              <Grid xs={12} sm={6} md={4}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    決定事項の自動記録
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    決定、担当者、フォローアップがセッションに紐付いて保存されます。
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Session rhythm */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 600,
                letterSpacing: "0.1em",
                fontSize: "0.875rem",
                display: "block",
                mb: 2,
              }}
            >
              SESSION RHYTHM
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                mb: 4,
                color: "text.primary"
              }}
            >
              セッションの前・中・後の使い方
            </Typography>
            <Stack spacing={3}>
              <Box sx={{ borderLeft: "4px solid", borderColor: "primary.main", pl: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "primary.main" }}>
                  1. セッション前
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  更新情報を提出または更新し、関連リンクを追加し、優先順位に投票します。
                </Typography>
              </Box>
              <Box sx={{ borderLeft: "4px solid", borderColor: "primary.main", pl: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "primary.main" }}>
                  2. セッション中
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  アジェンダをリアルタイムで追跡し、決定事項を記録し、新しいアクションを直接記録します。
                </Typography>
              </Box>
              <Box sx={{ borderLeft: "4px solid", borderColor: "primary.main", pl: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "primary.main" }}>
                  3. セッション後
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  フォローアップメモを追加し、担当者を確認し、チェックインをスケジュールします。
                </Typography>
              </Box>
              <Box sx={{ borderLeft: "4px solid", borderColor: "primary.main", pl: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "primary.main" }}>
                  4. セッション間の連携
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  投票とコメントを使用して、サイクル中の勢いを維持し、お互いに責任を持ち続けます。
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          {/* Tools */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 600,
                letterSpacing: "0.1em",
                fontSize: "0.875rem",
                display: "block",
                mb: 2,
              }}
            >
              TOOLS
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                mb: 4,
                color: "text.primary"
              }}
            >
              主要ツール
            </Typography>
            <Grid container spacing={3}>
              <Grid xs={12} md={4}>
                <Card sx={{ height: "100%", borderTop: "4px solid", borderColor: "primary.main" }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      更新情報ワークスペース
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      更新情報を作成し、リンクを追加し、緊急事項をマークし、投票の動向を確認します。
                    </Typography>
                    <Button
                      component={Link}
                      href="/updates"
                      variant="contained"
                      fullWidth
                      sx={{ mt: "auto" }}
                    >
                      更新情報へ →
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid xs={12} md={4}>
                <Card sx={{ height: "100%", borderTop: "4px solid", borderColor: "primary.main" }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      優先順位付けボード
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      緊急度とコミットメントをスコアリングし、実行順序を確定します。
                    </Typography>
                    <Button
                      component={Link}
                      href="/prioritization"
                      variant="contained"
                      fullWidth
                      sx={{ mt: "auto" }}
                    >
                      優先順位付けへ →
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
              <Grid xs={12} md={4}>
                <Card sx={{ height: "100%", borderTop: "4px solid", borderColor: "primary.main" }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      ワークシート・プレイブック
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      各役割に合わせたスクリプトとプロンプトを活用します。
                    </Typography>
                    <Button
                      component={Link}
                      href="/documentation/moderator"
                      variant="contained"
                      fullWidth
                      sx={{ mt: "auto" }}
                    >
                      ガイドを見る →
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Roles & preparation */}
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "primary.main",
                fontWeight: 600,
                letterSpacing: "0.1em",
                fontSize: "0.875rem",
                display: "block",
                mb: 2,
              }}
            >
              ROLES & PREPARATION
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                mb: 2,
                color: "text.primary"
              }}
            >
              役割別の準備
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: "text.secondary",
                mb: 4,
                maxWidth: "720px"
              }}
            >
              今回のミーティングで担当する役割のワークシートを選択して、準備を効率化しましょう。
            </Typography>
            <Grid container spacing={2}>
              <Grid xs={12} sm={4}>
                <Button
                  component={Link}
                  href="/worksheets/presenter"
                  variant="contained"
                  fullWidth
                  size="large"
                >
                  発表者ワークシート →
                </Button>
              </Grid>
              <Grid xs={12} sm={4}>
                <Button
                  component={Link}
                  href="/worksheets/coach"
                  variant="contained"
                  fullWidth
                  size="large"
                >
                  コーチワークシート →
                </Button>
              </Grid>
              <Grid xs={12} sm={4}>
                <Button
                  component={Link}
                  href="/worksheets/observer"
                  variant="contained"
                  fullWidth
                  size="large"
                >
                  オブザーバーワークシート →
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
