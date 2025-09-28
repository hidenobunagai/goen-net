"use client";

import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import { Badge, IconButton, Tooltip } from "@mui/material";
import type { MouseEvent } from "react";

export type UpdateVoteButtonProps = {
  viewerHasVoted: boolean;
  votes: number;
  disabled?: boolean;
  onToggle: () => void;
};

export function UpdateVoteButton({
  viewerHasVoted,
  votes,
  disabled = false,
  onToggle,
}: UpdateVoteButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onToggle();
  };

  const Icon = viewerHasVoted ? ThumbUpAltIcon : ThumbUpOffAltIcon;
  const tooltip = viewerHasVoted ? "Remove your vote" : "Vote for this update";

  return (
    <Tooltip title={tooltip} arrow disableInteractive>
      <span>
        <IconButton
          onClick={handleClick}
          disabled={disabled}
          color={viewerHasVoted ? "primary" : "default"}
          aria-label={tooltip}
          size="small"
          sx={{
            bgcolor: viewerHasVoted ? "primary.light" : "transparent",
            transition: "background-color 0.2s ease",
            "&:hover": {
              bgcolor: viewerHasVoted ? "primary.light" : "action.hover",
            },
          }}
        >
          <Badge
            color={viewerHasVoted ? "primary" : "default"}
            badgeContent={votes}
            showZero
            overlap="circular"
            sx={{
              "& .MuiBadge-badge": {
                fontWeight: 700,
                minWidth: 18,
              },
            }}
          >
            <Icon fontSize="small" />
          </Badge>
        </IconButton>
      </span>
    </Tooltip>
  );
}
