/**
 * Grid Component
 * Responsive grid layout
 */

import { isTablet } from '@/lib/responsive';
import React from 'react';
import { View, ViewProps } from 'react-native';

interface GridProps extends ViewProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: number;
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns = 2,
  gap = 16,
  className = '',
  style,
  ...props
}) => {
  // On mobile, always use 1 column. On tablet, use specified columns
  const actualColumns = isTablet ? columns : 1;

  return (
    <View
      className={`flex-row flex-wrap ${className}`}
      style={[{ marginHorizontal: -gap / 2 }, style]}
      {...props}
    >
      {React.Children.map(children, (child) => (
        <View
          style={{
            width: `${100 / actualColumns}%`,
            paddingHorizontal: gap / 2,
            marginBottom: gap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
};
