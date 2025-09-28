"use client";

import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import { Button } from "@mui/material";
import type { MouseEvent } from "react";

export type UpdateVoteButtonProps = {
  viewerHasVoted: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

export function UpdateVoteButton({
  viewerHasVoted,
  disabled = false,
  onToggle,
}: UpdateVoteButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onToggle();
  };

  return (
    <Button
      variant={viewerHasVoted ? "contained" : "outlined"}
      color="primary"
      size="small"
      disabled={disabled}
      onClick={handleClick}
      startIcon={
        viewerHasVoted ? (
          <ThumbUpAltIcon fontSize="small" />
        ) : (
          <ThumbUpOffAltIcon fontSize="small" />
        )
      }
      sx={{
        textTransform: "none",
        fontWeight: 600,
        minWidth: 96,
      }}
    >
      {viewerHasVoted ? "Voted" : "Vote"}
    </Button>
  );
}
