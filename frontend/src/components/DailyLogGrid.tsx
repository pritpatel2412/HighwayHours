import React from 'react';
import { DailyLog, LogSegment } from '../types/trip';

interface DailyLogGridProps {
  log: DailyLog;
  driverName?: string;
  carrierName?: string;
  truckNumber?: string;
}

export const DailyLogGrid: React.FC<DailyLogGridProps> = ({
  log,
  driverName = 'John Doe (Driver)',
  carrierName = 'HighwayHours Transport LLC',
  truckNumber = 'TRK-1049 / TRL-8821',
}) => {
  const GRID_WIDTH = 720;
  const GRID_HEIGHT = 160;
  const ROW_HEIGHT = 40;
  const LEFT_PADDING = 140;
  const RIGHT_PADDING = 80;
  const TOTAL_WIDTH = LEFT_PADDING + GRID_WIDTH + RIGHT_PADDING;
  const TOTAL_HEIGHT = GRID_HEIGHT + 140;

  const STATUS_ROWS: Record<string, number> = {
    OFF_DUTY: 0,
    SLEEPER_BERTH: 1,
    DRIVING: 2,
    ON_DUTY_NOT_DRIVING: 3,
  };

  const getYCenter = (statusKey: string): number => {
    const idx = STATUS_ROWS[statusKey] ?? 0;
    return idx * ROW_HEIGHT + ROW_HEIGHT / 2;
  };

  const getXPos = (fraction: number): number => {
    const clamped = Math.max(0, Math.min(24, fraction));
    return LEFT_PADDING + (clamped / 24) * GRID_WIDTH;
  };

  // Build continuous stepped SVG path
  const buildPathD = (segments: LogSegment[]): string => {
    if (!segments || segments.length === 0) return '';
    let d = '';
    let currentY: number | null = null;

    segments.forEach((seg, idx) => {
      const x1 = getXPos(seg.start_fraction);
      const x2 = getXPos(seg.end_fraction);
      const y = getYCenter(seg.status);

      if (idx === 0) {
        d += `M ${x1} ${y}`;
        currentY = y;
      } else if (currentY !== null && currentY !== y) {
        // Vertical step transition line
        d += ` L ${x1} ${y}`;
        currentY = y;
      }

      d += ` L ${x2} ${y}`;
    });

    return d;
  };

  const totalSum = (
    (log.totals.OFF_DUTY || 0) +
    (log.totals.SLEEPER_BERTH || 0) +
    (log.totals.DRIVING || 0) +
    (log.totals.ON_DUTY_NOT_DRIVING || 0)
  ).toFixed(2);

  const formattedDate = new Date(log.log_date).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="card-surface rounded-[28px] p-6 shadow-xl border border-black/5 overflow-x-auto my-4 print:shadow-none print:border-none print:m-0">
      {/* Header Fields */}
      <div className="border-b border-black/10 pb-4 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold uppercase tracking-tight text-[#232427] flex items-center gap-2">
              <span>Driver's Daily Log</span>
              <span className="text-xs font-serif-accent text-[#E34A32] lowercase text-normal">(24 Hours Grid)</span>
            </h3>
            <p className="text-xs text-[#55575c] font-mono">FMCSA Form § 395.8 Compliant Record of Duty Status</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block bg-[#171719] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
              Day {log.day_number}
            </span>
            <div className="text-xs font-bold text-[#232427]">{formattedDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-[#F7F7F5] p-3.5 rounded-2xl border border-black/5 mt-3 font-mono">
          <div>
            <span className="text-[#8a8c91] block font-sans text-[10px] uppercase tracking-wider font-semibold">TOTAL MILES DRIVEN</span>
            <span className="font-bold text-[#232427] text-sm">{log.total_miles} mi</span>
          </div>
          <div>
            <span className="text-[#8a8c91] block font-sans text-[10px] uppercase tracking-wider font-semibold">DRIVER NAME</span>
            <span className="font-bold text-[#232427]">{driverName}</span>
          </div>
          <div>
            <span className="text-[#8a8c91] block font-sans text-[10px] uppercase tracking-wider font-semibold">CARRIER NAME</span>
            <span className="font-bold text-[#232427]">{carrierName}</span>
          </div>
          <div>
            <span className="text-[#8a8c91] block font-sans text-[10px] uppercase tracking-wider font-semibold">VEHICLE / TRAILER #</span>
            <span className="font-bold text-[#232427]">{truckNumber}</span>
          </div>
        </div>
      </div>

      {/* SVG 24-Hour Grid */}
      <div className="w-full overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${TOTAL_WIDTH} ${TOTAL_HEIGHT}`}
          className="w-full max-w-[900px] h-auto min-w-[700px] select-none font-sans"
        >
          {/* Background Grid Box */}
          <rect
            x={LEFT_PADDING}
            y={0}
            width={GRID_WIDTH}
            height={GRID_HEIGHT}
            fill="#FAFBFB"
            stroke="#232427"
            strokeWidth="1.5"
          />

          {/* Status Row Backgrounds & Labels */}
          {[
            { name: '1. OFF DUTY', key: 'OFF_DUTY', total: log.totals.OFF_DUTY },
            { name: '2. SLEEPER BERTH', key: 'SLEEPER_BERTH', total: log.totals.SLEEPER_BERTH },
            { name: '3. DRIVING', key: 'DRIVING', total: log.totals.DRIVING },
            { name: '4. ON DUTY (NOT DRIVING)', key: 'ON_DUTY_NOT_DRIVING', total: log.totals.ON_DUTY_NOT_DRIVING },
          ].map((row, idx) => {
            const y = idx * ROW_HEIGHT;
            return (
              <g key={row.key}>
                {/* Horizontal row divider line */}
                {idx > 0 && (
                  <line
                    x1={0}
                    y1={y}
                    x2={LEFT_PADDING + GRID_WIDTH + RIGHT_PADDING}
                    y2={y}
                    stroke="#E2E4E6"
                    strokeWidth="1"
                  />
                )}
                {/* Row Label */}
                <text
                  x={12}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fontSize="11"
                  fontWeight="700"
                  fill="#232427"
                >
                  {row.name}
                </text>
                {/* Right Totals Cell */}
                <rect
                  x={LEFT_PADDING + GRID_WIDTH}
                  y={y}
                  width={RIGHT_PADDING}
                  height={ROW_HEIGHT}
                  fill="#F4F5F5"
                  stroke="#E2E4E6"
                />
                <text
                  x={LEFT_PADDING + GRID_WIDTH + RIGHT_PADDING / 2}
                  y={y + ROW_HEIGHT / 2 + 4}
                  fontSize="12"
                  fontWeight="800"
                  textAnchor="middle"
                  fill="#232427"
                >
                  {(row.total || 0).toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Hour Grid Lines & Hour Tick Numbers */}
          {Array.from({ length: 25 }).map((_, hr) => {
            const x = getXPos(hr);
            const isMid = hr === 12;
            const isQuarterLabel = hr % 2 === 0;

            return (
              <g key={hr}>
                {/* Vertical Hour Grid Line */}
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={GRID_HEIGHT}
                  stroke={hr === 0 || hr === 24 || isMid ? '#232427' : '#E2E4E6'}
                  strokeWidth={hr === 0 || hr === 24 || isMid ? '1.5' : '1'}
                />

                {/* Sub-hour ticks (15 min, 30 min, 45 min) */}
                {hr < 24 &&
                  [0.25, 0.5, 0.75].map((q) => {
                    const qx = getXPos(hr + q);
                    const tickHeight = q === 0.5 ? 12 : 6;
                    return (
                      <g key={q}>
                        {[0, 1, 2, 3].map((rowIdx) => (
                          <line
                            key={rowIdx}
                            x1={qx}
                            y1={rowIdx * ROW_HEIGHT}
                            x2={qx}
                            y2={rowIdx * ROW_HEIGHT + tickHeight}
                            stroke="#CBD1D6"
                            strokeWidth="0.75"
                          />
                        ))}
                      </g>
                    );
                  })}

                {/* Hour Header Label */}
                {isQuarterLabel && (
                  <text
                    x={x}
                    y={-6}
                    fontSize="10"
                    fontWeight="700"
                    fill="#55575c"
                    textAnchor="middle"
                  >
                    {hr === 0 ? 'M' : hr === 12 ? 'N' : hr > 12 ? hr - 12 : hr}
                  </text>
                )}
              </g>
            );
          })}

          {/* Totals Header Box */}
          <rect
            x={LEFT_PADDING + GRID_WIDTH}
            y={-20}
            width={RIGHT_PADDING}
            height={20}
            fill="#171719"
          />
          <text
            x={LEFT_PADDING + GRID_WIDTH + RIGHT_PADDING / 2}
            y={-6}
            fontSize="10"
            fontWeight="800"
            fill="#ffffff"
            textAnchor="middle"
          >
            TOTAL HRS
          </text>

          {/* Plotted Duty Status Line (SprintForge Orange Signature Line) */}
          <path
            d={buildPathD(log.segments)}
            fill="none"
            stroke="#E34A32"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Right Bottom Total Sum Verification Box */}
          <g transform={`translate(${LEFT_PADDING + GRID_WIDTH}, ${GRID_HEIGHT})`}>
            <rect x={0} y={0} width={RIGHT_PADDING} height={32} fill="#171719" />
            <text
              x={RIGHT_PADDING / 2}
              y={20}
              fontSize="12"
              fontWeight="900"
              fill="#E34A32"
              textAnchor="middle"
            >
              {totalSum} hrs
            </text>
          </g>

          {/* Remarks Section Grid Line & Header */}
          <line
            x1={0}
            y1={GRID_HEIGHT + 35}
            x2={LEFT_PADDING + GRID_WIDTH + RIGHT_PADDING}
            y2={GRID_HEIGHT + 35}
            stroke="#232427"
            strokeWidth="1.5"
          />
          <text
            x={12}
            y={GRID_HEIGHT + 52}
            fontSize="11"
            fontWeight="800"
            fill="#232427"
            className="uppercase tracking-wider"
          >
            REMARKS (City, State / Highway Location)
          </text>
        </svg>
      </div>

      {/* Remarks List */}
      <div className="mt-4 pt-3 border-t border-black/10">
        {log.remarks && log.remarks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            {log.remarks.map((rem, idx) => {
              const hr = (rem.time_fraction).toFixed(2);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-[#F7F7F5] border border-black/5 px-3.5 py-2 rounded-2xl"
                >
                  <span className="font-bold text-[#E34A32] bg-[#E34A32]/10 px-2 py-0.5 rounded-full text-[11px]">
                    {hr} hrs
                  </span>
                  <span className="text-[#232427] font-sans font-medium truncate">{rem.remark}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-[#8a8c91] italic">No duty status changes recorded on this log sheet.</div>
        )}
      </div>
    </div>
  );
};

