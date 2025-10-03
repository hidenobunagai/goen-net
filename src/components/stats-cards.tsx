"use client";

import { Card, CardContent } from "@mui/material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Unstable_Grid2";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Calendar, Users } from "lucide-react";
import { get } from "@/lib/api-client";
import { logger } from "@/lib/logger";

interface StatsData {
  totalUpdates: number;
  urgentItems: number;
  activeMembers: number;
  daysToMeeting: number;
}

export function StatsCards() {
  logger.debug("StatsCards component rendering");

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: async () => {
      logger.debug("Fetching stats from API");
      const data = await get<StatsData>("/api/stats", {
        cache: "no-cache",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      logger.debug("Stats data received", { data });
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  logger.debug("StatsCards state", { isLoading, error, stats: stats ?? null });

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          p: 4,
          bgcolor: "error.50",
          borderRadius: 1,
        }}
      >
        <Typography variant="body1" color="error.main">
          Failed to load statistics. Please refresh the page to try again.
        </Typography>
      </Box>
    );
  }

  const statsConfig = [
    {
      key: "totalUpdates",
      label: "Total Updates",
      value: isLoading ? "..." : stats?.totalUpdates || 0,
      icon: Activity,
      iconColor: "#2563eb", // blue-600
      bgColor: "#eff6ff", // blue-50
    },
    {
      key: "urgentItems",
      label: "Urgent Items",
      value: isLoading ? "..." : stats?.urgentItems || 0,
      icon: AlertTriangle,
      iconColor: "#ea580c", // orange-600
      bgColor: "#fff7ed", // orange-50
    },
    {
      key: "activeMembers",
      label: "Active Members",
      value: isLoading ? "..." : stats?.activeMembers || 0,
      icon: Users,
      iconColor: "#16a34a", // green-600
      bgColor: "#f0fdf4", // green-50
    },
    {
      key: "daysToMeeting",
      label: "Days to Meeting",
      value: isLoading ? "..." : stats?.daysToMeeting || 0,
      icon: Calendar,
      iconColor: "#9333ea", // purple-600
      bgColor: "#faf5ff", // purple-50
    },
  ];

  return (
    <Grid
      container
      spacing={{ xs: 1, sm: 2 }}
      columns={{ xs: 1, sm: 2, md: 4 }}
      sx={{ mb: 3 }}
    >
      {statsConfig.map((stat) => {
        const Icon = stat.icon;
        return (
          <Grid xs={2} key={stat.key}>
            <Card
              sx={{ height: "100%", transition: "box-shadow 0.2s ease" }}
              elevation={0}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1.5, sm: 2 },
                  }}
                >
                  <Box
                    sx={{
                      p: { xs: 1, sm: 1.5 },
                      borderRadius: 1,
                      bgcolor: stat.bgColor,
                      color: stat.iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={20} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontWeight: 500, mb: 0.5 }}
                    >
                      {stat.label}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 700, color: "text.primary" }}
                    >
                      {stat.value}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
