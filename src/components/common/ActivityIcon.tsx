import React from 'react';
import { Mic, Bot, Upload, ListChecks, PenLine, LucideProps } from 'lucide-react';
import { ActivityType } from '../../types';

interface ActivityIconProps extends Omit<LucideProps, 'ref'> {
  type: ActivityType;
  className?: string;
  size?: number;
}

export const ActivityIcon: React.FC<ActivityIconProps> = ({
  type,
  className = '',
  size = 20,
  strokeWidth = 1.8,
  ...props
}) => {
  const commonProps = {
    size,
    strokeWidth,
    className,
    ...props,
  };

  switch (type) {
    case 'voice_recording':
      return <Mic {...commonProps} />;
    case 'ai_speaking':
      return <Bot {...commonProps} />;
    case 'file_upload':
      return <Upload {...commonProps} />;
    case 'quiz':
      return <ListChecks {...commonProps} />;
    case 'text_response':
      return <PenLine {...commonProps} />;
    default:
      return <Mic {...commonProps} />;
  }
};
