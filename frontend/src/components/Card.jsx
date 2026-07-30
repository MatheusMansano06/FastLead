import clsx from 'clsx';

const Card = ({
  padding = 'md',
  hover = false,
  className = '',
  children,
  ...props
}) => {
  const paddingSizes = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  const classes = clsx(
    'bg-white dark:bg-neutral-900',
    'border border-neutral-200 dark:border-neutral-800',
    'rounded-lg',
    'shadow-elevation-1 dark:shadow-elevation-1',
    hover && 'card-hover',
    paddingSizes[padding],
    className
  );

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
