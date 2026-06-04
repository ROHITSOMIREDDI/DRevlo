'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CycleTimeData {
  name: string; // Sprint name or Date
  avgHours: number;
  p50Hours: number;
  p90Hours: number;
}

interface PrCycleTimeProps {
  data: CycleTimeData[];
}

export default function PrCycleTime({ data }: PrCycleTimeProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-6">
        <h3 className="text-base font-bold text-slate-100">PR Cycle Time</h3>
        <p className="text-xs text-slate-400">Average review and merge turnaround in hours</p>
      </div>

      <div className="h-72 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            No data available for the selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(34, 211, 238)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="rgb(34, 211, 238)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorP90" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(99, 102, 241)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="rgb(99, 102, 241)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.15)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="rgb(100, 116, 139)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="rgb(100, 116, 139)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(15, 23, 42)',
                  borderColor: 'rgb(30, 41, 59)',
                  borderRadius: '12px',
                  color: 'rgb(241, 245, 249)',
                  fontSize: '11px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                }}
                itemStyle={{ color: 'rgb(203, 213, 225)' }}
                labelStyle={{ fontWeight: 'bold', color: 'rgb(255, 255, 255)', marginBottom: '4px' }}
                formatter={(value: unknown) => [`${Number(value).toFixed(1)} hrs`]}
              />
              <Area
                name="Avg Cycle Time"
                type="monotone"
                dataKey="avgHours"
                stroke="rgb(34, 211, 238)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAvg)"
              />
              <Area
                name="p90 Turnaround"
                type="monotone"
                dataKey="p90Hours"
                stroke="rgb(99, 102, 241)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorP90)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
