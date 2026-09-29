import { Button } from "@mui/material";
import { Plus, Inbox } from "lucide-react";
export function EmptyState({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Button
          variant="contained"
          startIcon={<Plus size={17} />}
          onClick={onAction}
        >
          {action}
        </Button>
      )}
    </div>
  );
}
