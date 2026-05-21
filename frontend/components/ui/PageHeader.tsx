import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  breadcrumbs,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-[hsl(var(--muted))]">/</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-[hsl(var(--muted))] hover:text-[hsl(var(--primary))] transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-[hsl(var(--foreground))] font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-h1 text-[hsl(var(--foreground))]">{title}</h1>
          {subtitle && (
            <p className="text-sm text-[hsl(var(--muted))] mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
