"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import {
  AlertTriangle,
  Clock,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  User,
} from "lucide-react";

interface Update {
  id: string;
  by: string;
  category: 0 | 1 | 2; // 0: general, 1: highlight, 2: question
  urgent: boolean;
  title: string;
  body: string;
  when: -1 | 1; // -1: past, 1: future
  createdAt: string;
  viewerIsOwner: boolean;
}

const categoryConfig = {
  0: {
    label: "General",
    icon: MessageCircle,
    color: "bg-blue-100 text-blue-800",
    iconColor: "text-blue-600",
  },
  1: {
    label: "Highlight",
    icon: Lightbulb,
    color: "bg-green-100 text-green-800",
    iconColor: "text-green-600",
  },
  2: {
    label: "Question",
    icon: HelpCircle,
    color: "bg-purple-100 text-purple-800",
    iconColor: "text-purple-600",
  },
};

export function UpdatesBoard() {
  const {
    data: updates,
    isLoading,
    error,
  } = useQuery<{ ok: boolean; updates: Update[] }>({
    queryKey: ["updates"],
    queryFn: async () => {
      const response = await fetch("/api/updates?limit=20");
      if (!response.ok) {
        throw new Error("Failed to fetch updates");
      }
      return response.json();
    },
  });

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <p className="text-red-600">Failed to load updates</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse border rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const updatesData = updates?.updates || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Recent Updates
            <Badge variant="secondary" className="ml-2">
              {updatesData.length}
            </Badge>
          </CardTitle>
          <Button size="sm" variant="outline">
            View All Updates
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {updatesData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No updates yet</p>
            <p className="text-sm">Be the first to share an update!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updatesData.slice(0, 6).map((update) => {
              const categoryInfo = categoryConfig[update.category];
              const Icon = categoryInfo.icon;
              const timeAgo = formatDistance(
                new Date(update.createdAt),
                new Date(),
                { addSuffix: true }
              );

              return (
                <div
                  key={update.id}
                  className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                    update.urgent ? "border-red-200 bg-red-50" : "border-border"
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${categoryInfo.color}`}>
                      <Icon className={`w-4 h-4 ${categoryInfo.iconColor}`} />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">
                            {update.title}
                          </h4>
                          {update.urgent && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Urgent
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{update.by}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          <span>{timeAgo}</span>
                          <Badge variant="outline" className="text-xs">
                            {categoryInfo.label}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-foreground">
                        {update.body.length > 150
                          ? `${update.body.substring(0, 150)}...`
                          : update.body}
                      </p>

                      <div className="flex items-center justify-between pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1 text-sm text-muted-foreground"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Discuss</span>
                        </Button>

                        {update.when === 1 && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Future
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
