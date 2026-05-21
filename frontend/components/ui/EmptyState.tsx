import React from 'react';
import { FileQuestion, Inbox, Search, Users, Package } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: 'file' | 'inbox' | 'search' | 'users' | 'package';
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
  className = ''
}) => {
  const getIcon = () => {
    const iconClass = "h-12 w-12 text-[hsl(var(--muted))] stroke-[1.5px]";
    switch (icon) {
      case 'file':
        return <FileQuestion className={iconClass} />;
      case 'search':
        return <Search className={iconClass} />;
      case 'users':
        return <Users className={iconClass} />;
      case 'package':
        return <Package className={iconClass} />;
      default:
        return <Inbox className={iconClass} />;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="mb-4">
        {getIcon()}
      </div>
      <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[hsl(var(--muted))] max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
