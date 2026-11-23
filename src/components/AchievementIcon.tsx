import React from 'react';
import type { AchievementIcon as AchievementIconName } from '../progression/achievements';
import {
  IconBall,
  IconBolt,
  IconCalendar,
  IconCrown,
  IconFlame,
  IconGlobe,
  IconMedal,
  IconMegaphone,
  IconShield,
  IconSparkles,
  IconStar,
  IconTarget,
  IconTrophy,
  IconUsers,
  IconWhistle,
} from './career/GameIcons';

const ICONS: Record<AchievementIconName, React.ComponentType<{ className?: string }>> = {
  ball: IconBall,
  flame: IconFlame,
  trophy: IconTrophy,
  crown: IconCrown,
  star: IconStar,
  shield: IconShield,
  bolt: IconBolt,
  globe: IconGlobe,
  calendar: IconCalendar,
  users: IconUsers,
  target: IconTarget,
  sparkles: IconSparkles,
  whistle: IconWhistle,
  medal: IconMedal,
  megaphone: IconMegaphone,
};

export function AchievementGlyph({
  icon,
  className = 'w-4 h-4',
}: {
  icon: AchievementIconName;
  className?: string;
}) {
  const Icon = ICONS[icon] || IconStar;
  return <Icon className={className} />;
}
