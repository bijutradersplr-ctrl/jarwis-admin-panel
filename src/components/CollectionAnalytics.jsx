import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Cell
} from 'recharts';
import { TrendingUp, Users, Target as TargetIcon } from 'lucide-react';

const CollectionAnalytics = ({ allPayments, salesmenTargets }) => {
    // 1. Process Trend Data (Month vs Last Month)
    const trendData = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        const currentMonthData = {};
        const lastMonthData = {};

        allPayments.forEach(p => {
            if (p.status !== 'Approved' || !p.timestamp) return;
            const date = p.timestamp.toDate();
            const day = date.getDate();
            const month = date.getMonth();
            const year = date.getFullYear();

            if (month === currentMonth && year === currentYear) {
                currentMonthData[day] = (currentMonthData[day] || 0) + Number(p.amount || 0);
            } else if (month === lastMonth && year === lastMonthYear) {
                lastMonthData[day] = (lastMonthData[day] || 0) + Number(p.amount || 0);
            }
        });

        const data = [];
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let i = 1; i <= daysInMonth; i++) {
            data.push({
                day: i,
                current: currentMonthData[i] || 0,
                previous: lastMonthData[i] || 0
            });
        }
        return data;
    }, [allPayments]);

    // 2. Process Salesman Performance Data
    const performanceData = useMemo(() => {
        return salesmenTargets.map(s => ({
            name: s.name,
            target: s.monthly_target,
            achieved: s.achieved,
            percentage: s.monthly_target > 0 ? Math.round((s.achieved / s.monthly_target) * 100) : 0
        })).sort((a, b) => {
            if (b.percentage !== a.percentage) return b.percentage - a.percentage;
            return b.achieved - a.achieved;
        });
    }, [salesmenTargets]);

    return (
        <div className="flex flex-col gap-6 animate-fade-in max-w-2xl mx-auto">
            {/* Trend Chart */}
            <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Collection Trend</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Current vs Previous Month</p>
                    </div>
                </div>

                <div className="h-[250px] w-full overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `Day ${val}`}
                            />
                            <YAxis
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                                itemStyle={{ fontWeight: '900', textTransform: 'uppercase' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px', textTransform: 'uppercase', fontWeight: '900' }} />
                            <Line
                                type="monotone"
                                dataKey="current"
                                name="Current Month"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, fill: '#3b82f6' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="previous"
                                name="Last Month"
                                stroke="#94a3b8"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                        <TargetIcon size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Sales Performance</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Monthly Achievement vs Target</p>
                    </div>
                </div>

                <div className="h-[250px] w-full overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                        <BarChart data={performanceData} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                            <XAxis
                                type="number"
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                stroke="#94a3b8"
                                fontSize={9}
                                fontWeight="900"
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                cursor={{ fill: '#ffffff05' }}
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px', fontSize: '10px' }}
                            />
                            <Bar dataKey="achieved" name="Achieved" radius={[0, 4, 4, 0]}>
                                {performanceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.percentage >= 100 ? '#10b981' : '#3b82f6'} fillOpacity={0.8} />
                                ))}
                            </Bar>
                            <Bar dataKey="target" name="Target" fill="#1e293b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default CollectionAnalytics;
