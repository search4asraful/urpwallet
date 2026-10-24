import React from 'react';
import * as Icons from 'lucide-react';

interface CategoryIconProps {
  name?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name = 'CircleDollarSign',
  className = 'w-5 h-5',
  style,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LucideIcon = (Icons as any)[name] || Icons.CircleDollarSign;
  return <LucideIcon className={className} style={style} />;
};
