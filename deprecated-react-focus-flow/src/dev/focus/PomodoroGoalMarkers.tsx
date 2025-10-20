import React from 'react';
import { GoalMarkerDivision } from '../../types';

interface PomodoroGoalMarkersProps {
    radius: number;
    minWorkMins: number;
    displayedTime: number; 
    goalMarkerDivision: GoalMarkerDivision;
    center: number;
}

const getFixedLabelHourPosition = (division: GoalMarkerDivision, index: number): number => {
    switch (division) {
        case 4: return (index + 1) * 3;
        case 3: return (index + 1) * 4;
        case 6: return (index + 1) * 2;
        default: return 0;
    }
};

const PomodoroGoalMarkers: React.FC<PomodoroGoalMarkersProps> = ({ radius, minWorkMins, displayedTime, goalMarkerDivision, center }) => {
    if (goalMarkerDivision === 0 || minWorkMins < goalMarkerDivision) {
        return null;
    }

    const ringStrokeWidth = 25;
    const padding = 12;
    const shortTickLength = 5;
    const effectiveRadius = radius - (ringStrokeWidth / 2) - padding;
    const dotRadius = effectiveRadius - (shortTickLength / 2);
    const labelRadius = dotRadius - 15;

    let fractions: number[] = [];
    if (goalMarkerDivision === 4) fractions = [0.25, 0.5, 0.75, 1];
    else if (goalMarkerDivision === 3) fractions = [1/3, 2/3, 1];
    else fractions = [1/6, 2/6, 3/6, 4/6, 5/6, 1];
    
    const markersData = fractions.map(fraction => ({
        fraction,
        minuteValue: Math.round(minWorkMins * fraction)
    }));

    if (markersData.length > 0) {
       markersData[markersData.length - 1].minuteValue = minWorkMins;
    }

    const uniqueMarkers = markersData.filter((marker, index, self) => 
        marker.minuteValue > 0 && 
        marker.minuteValue <= Math.ceil(minWorkMins) &&
        index === self.findIndex(m => m.minuteValue === marker.minuteValue)
    );

    return (
        <g className="transition-opacity duration-300">
            {uniqueMarkers.map(({ fraction, minuteValue }, index) => {
                const isGoal = fraction === 1;
                const idealPosition = (minuteValue / minWorkMins) * 60;
                const finalTickIndex = Math.round(idealPosition * 2) / 2;
                
                const tickIndexForDotAngle = finalTickIndex >= 60 ? 0 : finalTickIndex;
                const dotTargetAngleRad = ((tickIndexForDotAngle / 60) * 2 * Math.PI) - (Math.PI / 2);
                const dotX = center + dotRadius * Math.cos(dotTargetAngleRad);
                const dotY = center + dotRadius * Math.sin(dotTargetAngleRad);
                
                let labelTargetAngleRad;
                if (isGoal) {
                    labelTargetAngleRad = -Math.PI / 2;
                } else {
                    const fixedHourPosition = getFixedLabelHourPosition(goalMarkerDivision, index);
                    const hourForAngle = fixedHourPosition === 0 ? 12 : fixedHourPosition;
                    labelTargetAngleRad = (hourForAngle / 12) * 2 * Math.PI - Math.PI / 2;
                }
                
                const labelX = center + labelRadius * Math.cos(labelTargetAngleRad);
                const labelY = center + labelRadius * Math.sin(labelTargetAngleRad);

                const isAchieved = displayedTime >= minuteValue * 60;
                
                const classNames = `font-sans fill-[var(--text-muted)] text-[1.1rem] font-semibold text-center align-middle transition-colors duration-300 ${isGoal ? 'fill-[var(--text-color)] font-bold text-[1.3rem]' : ''} ${isAchieved ? 'fill-[var(--accent-color)] font-bold' : ''}`;
                const dotFill = isAchieved ? 'var(--accent-color)' : 'var(--text-muted)';
                const dotDisplayRadius = 1.5;

                return (
                    <g key={minuteValue}>
                        <circle cx={dotX} cy={dotY} r={dotDisplayRadius} fill={dotFill} className="transition-colors duration-300" />
                        <text x={labelX} y={labelY} className={classNames} dominantBaseline="middle" textAnchor="middle">
                            {minuteValue}
                        </text>
                    </g>
                );
            })}
        </g>
    );
};

export default PomodoroGoalMarkers;