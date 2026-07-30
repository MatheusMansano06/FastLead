import Card from './Card';

const KPICard = ({
  title,
  value,
  suffix = '',
  change,
  icon,
  trend = 'up', // 'up', 'down', 'neutral'
}) => {
  const trendColors = {
    up: 'text-success',
    down: 'text-error',
    neutral: 'text-neutral-500 dark:text-neutral-400',
  };

  const trendArrows = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <Card padding="lg" hover>
      <div className="flex items-start justify-between">
        <div className="flex-grow">
          <p className="text-body-sm text-neutral-600 dark:text-neutral-400 mb-2">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-heading-md font-display">
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix && <span className="text-body-lg">{suffix}</span>}
            </h3>
          </div>
          {change !== undefined && (
            <div className={`text-body-sm font-medium mt-2 ${trendColors[trend]}`}>
              <span>{trendArrows[trend]}</span>
              {' '}
              {typeof change === 'number' ? `${Math.abs(change).toFixed(1)}%` : change}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 text-3xl">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default KPICard;
