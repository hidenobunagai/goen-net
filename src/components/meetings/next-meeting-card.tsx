"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meeting } from "@/types/meetings";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistance } from "date-fns";
import { Calendar, Clock, MapPin, Users } from "lucide-react";

export function NextMeetingCard() {
  const {
    data: meeting,
    isLoading,
    error,
  } = useQuery<Meeting>({
    queryKey: ["upcoming-meeting"],
    queryFn: async () => {
      const response = await fetch("/api/meetings/upcoming");
      if (!response.ok) {
        throw new Error("Failed to fetch upcoming meeting");
      }
      return response.json();
    },
  });

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <p className="text-red-600 text-sm">
            Failed to load meeting information
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!meeting) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No upcoming meetings scheduled</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const meetingDate = new Date(meeting.date);
  const timeUntilMeeting = formatDistance(meetingDate, new Date(), {
    addSuffix: true,
  });

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Calendar className="w-5 h-5" />
          Next Forum Meeting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg text-foreground">
            {meeting.title}
          </h3>
          <p className="text-sm text-muted-foreground">{meeting.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {format(meetingDate, "EEEE, MMMM do")}
              </div>
              <div className="text-muted-foreground">
                {format(meetingDate, "h:mm a")}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {Math.floor(meeting.duration / 60)}h {meeting.duration % 60}m
              </div>
              <div className="text-muted-foreground">{timeUntilMeeting}</div>
            </div>
          </div>

          {meeting.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{meeting.location}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {meeting.attendees.length} attendees
              </div>
              <div className="text-muted-foreground">confirmed</div>
            </div>
          </div>
        </div>

        {meeting.agenda && meeting.agenda.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Agenda Preview</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {meeting.agenda.slice(0, 3).map((item, index) => (
                <li key={index}>• {item}</li>
              ))}
              {meeting.agenda.length > 3 && (
                <li>• ... and {meeting.agenda.length - 3} more items</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" className="flex-1">
            View Full Agenda
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            Add to Calendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
