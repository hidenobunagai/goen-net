"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Calendar, Users } from "lucide-react";

interface StatsData {
  totalUpdates: number;
  urgentItems: number;
  activeMembers: number;
  daysToMeeting: number;
}

export function StatsCards() {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      return response.json();
    },
    staleTime: 0, // Force refetch on every mount
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        Failed to load statistics
      </div>
    );
  }

  const statsConfig = [
    {
      key: "totalUpdates",
      label: "Total Updates",
      value: stats?.totalUpdates || 0,
      icon: Activity,
      iconColor: "#2563eb", // blue-600
      bgColor: "#eff6ff", // blue-50
    },
    {
      key: "urgentItems",
      label: "Urgent Items",
      value: stats?.urgentItems || 0,
      icon: AlertTriangle,
      iconColor: "#ea580c", // orange-600
      bgColor: "#fff7ed", // orange-50
    },
    {
      key: "activeMembers",
      label: "Active Members",
      value: stats?.activeMembers || 0,
      icon: Users,
      iconColor: "#16a34a", // green-600
      bgColor: "#f0fdf4", // green-50
    },
    {
      key: "daysToMeeting",
      label: "Days to Meeting",
      value: stats?.daysToMeeting || 0,
      icon: Calendar,
      iconColor: "#9333ea", // purple-600
      bgColor: "#faf5ff", // purple-50
    },
  ];

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      data-component-version="v2.0.0"
    >
      {statsConfig.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.key} className="transition-all hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: stat.bgColor,
                    color: stat.iconColor,
                  }}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p
                    className="text-2xl font-bold text-foreground"
                    data-testid={`stats-${stat.key
                      .replace(/([A-Z])/g, "-$1")
                      .toLowerCase()}`}
                  >
                    {isLoading ? "..." : stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
