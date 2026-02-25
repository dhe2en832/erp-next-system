import React from 'react';

export interface SummaryCard {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

interface SummaryCardsProps {
  cards: SummaryCard[];
}

const colorClasses = {
  blue: 'bg-blue-50 border-blue-200 text-blue-600',
  green: 'bg-green-50 border-green-200 text-green-600',
  purple: 'bg-purple-50 border-purple-200 text-purple-600',
  orange: 'bg-orange-50 border-orange-200 text-orange-600'
};

const colorTextClasses = {
  blue: 'text-blue-900',
  green: 'text-green-900',
  purple: 'text-purple-900',
  orange: 'text-orange-900'
};

export default function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${colorClasses[card.color]}`}
        >
          <div className={`text-sm font-medium ${colorTextClasses[card.color]} mb-1`}>
            {card.label}
          </div>
          <div className={`text-2xl font-bold ${colorTextClasses[card.color]}`}>
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
