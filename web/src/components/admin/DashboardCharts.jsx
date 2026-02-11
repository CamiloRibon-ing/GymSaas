import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import React from 'react';

export function BarChart({ data, keys, indexBy, colors, title }) {
  return (
    <div style={{ height: 320, width: '100%', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #1976d211', padding: 24, marginBottom: 32 }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: '#1976d2', marginBottom: 12 }}>{title}</div>
      <ResponsiveBar
        data={data}
        keys={keys}
        indexBy={indexBy}
        margin={{ top: 30, right: 30, bottom: 50, left: 60 }}
        padding={0.3}
        colors={colors}
        axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: indexBy, legendPosition: 'middle', legendOffset: 32 }}
        axisLeft={{ tickSize: 5, tickPadding: 5, tickRotation: 0, legend: keys[0], legendPosition: 'middle', legendOffset: -40 }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        animate
        theme={{
          axis: { ticks: { text: { fill: '#64748b' } }, legend: { text: { fill: '#1976d2' } } },
          legends: { text: { fill: '#64748b' } },
        }}
      />
    </div>
  );
}

export function PieChart({ data, title }) {
  return (
    <div style={{ height: 320, width: '100%', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #1976d211', padding: 24, marginBottom: 32 }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: '#1976d2', marginBottom: 12 }}>{title}</div>
      <ResponsivePie
        data={data}
        margin={{ top: 30, right: 30, bottom: 50, left: 30 }}
        innerRadius={0.5}
        padAngle={1}
        cornerRadius={5}
        activeOuterRadiusOffset={8}
        colors={{ scheme: 'paired' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabelsTextColor="#64748b"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        animate
        theme={{ legends: { text: { fill: '#64748b' } } }}
      />
    </div>
  );
}
