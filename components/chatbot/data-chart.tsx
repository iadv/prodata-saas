'use client';

import { Config, Result } from '@/lib/types';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { transformDataForMultiLineChart } from '@/lib/rechart-format';

interface DataChartProps {
  config: Config;
  data: Result[];
}

export function DataChart({ config, data }: DataChartProps) {
  const colors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  function toTitleCase(str: string): string {
    return str
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  const renderChart = () => {
    if (!data || !config) return <div>No chart data</div>;
    
    const parsedChartData = data.map((item) => {
      const parsedItem: { [key: string]: any } = {};
      for (const [key, value] of Object.entries(item)) {
        parsedItem[key] = isNaN(Number(value)) ? value : Number(value);
      }
      return parsedItem;
    });

    const processChartData = (data: Result[], chartType: string) => {
      if (chartType === 'bar' || chartType === 'pie') {
        if (data.length <= 8) {
          return data;
        }
        return data.slice(0, 20);
      }
      return data;
    };

    const chartData = processChartData(parsedChartData, config.type);
    
    // Calculate min and max for numeric axes
    const calculateDomain = (dataKey: string) => {
      if (!chartData.length) return [0, 0];
      
      const values = chartData.map(item => Number(item[dataKey])).filter(val => !isNaN(val));
      if (!values.length) return [0, 0];
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      // Add some padding to the domain
      const padding = (max - min) * 0.1;
      return [min > 0 ? (min - padding > 0 ? min - padding : 0) : min - padding, max + padding];
    };

    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={config.xKey}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => typeof value === 'string' && value.length > 15 ? `${value.substring(0, 15)}...` : value}
                height={60}
                angle={-45}
                textAnchor="end"
              >
                <Label
                  value={toTitleCase(config.xKey)}
                  offset={-10}
                  position="insideBottom"
                />
              </XAxis>
              <YAxis
                domain={calculateDomain(config.yKeys[0])}
                tickFormatter={(value) => (
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                )}
              >
                <Label
                  value={toTitleCase(config.yKeys[0])}
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>
              <Tooltip 
                formatter={(value) => [Number(value).toLocaleString(), '']}
                labelFormatter={(label) => `${toTitleCase(config.xKey)}: ${label}`}
              />
              {config.legend && <Legend wrapperStyle={{ paddingTop: 10 }} />}
              {config.yKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={toTitleCase(key)}
                  fill={colors[index % colors.length]}
                  animationDuration={1000}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        const { data: transformedData, xAxisField, lineFields } = transformDataForMultiLineChart(
          chartData,
          config,
        );
        const useTransformedData =
          config.multipleLines &&
          config.measurementColumn &&
          config.yKeys.includes(config.measurementColumn);
          
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart 
              data={useTransformedData ? transformedData : chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={useTransformedData ? config.xKey : config.xKey}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => typeof value === 'string' && value.length > 15 ? `${value.substring(0, 15)}...` : value}
                height={60}
                angle={-45}
                textAnchor="end"
              >
                <Label
                  value={toTitleCase(
                    useTransformedData ? xAxisField : config.xKey,
                  )}
                  offset={-10}
                  position="insideBottom"
                />
              </XAxis>
              <YAxis
                domain={calculateDomain(useTransformedData ? lineFields[0] : config.yKeys[0])}
                tickFormatter={(value) => (
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                )}
              >
                <Label
                  value={toTitleCase(config.yKeys[0])}
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>
              <Tooltip 
                formatter={(value) => [Number(value).toLocaleString(), '']}
                labelFormatter={(label) => `${toTitleCase(config.xKey)}: ${label}`}
              />
              {config.legend && <Legend wrapperStyle={{ paddingTop: 10 }} />}
              {useTransformedData
                ? lineFields.map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={toTitleCase(key)}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      animationDuration={1000}
                    />
                  ))
                : config.yKeys.map((key, index) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={toTitleCase(key)}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      animationDuration={1000}
                    />
                  ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart 
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={config.xKey}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => typeof value === 'string' && value.length > 15 ? `${value.substring(0, 15)}...` : value}
                height={60}
                angle={-45}
                textAnchor="end"
              />
              <YAxis
                domain={calculateDomain(config.yKeys[0])}
                tickFormatter={(value) => (
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                )}
              />
              <Tooltip 
                formatter={(value) => [Number(value).toLocaleString(), '']}
                labelFormatter={(label) => `${toTitleCase(config.xKey)}: ${label}`}
              />
              {config.legend && <Legend wrapperStyle={{ paddingTop: 10 }} />}
              {config.yKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={toTitleCase(key)}
                  fill={colors[index % colors.length]}
                  stroke={colors[index % colors.length]}
                  fillOpacity={0.6}
                  animationDuration={1000}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <Pie
                data={chartData}
                dataKey={config.yKeys[0]}
                nameKey={config.xKey}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={140}
                paddingAngle={1}
                label={(entry) => `${entry.name}: ${Number(entry[config.yKeys[0]]).toLocaleString()}`}
                labelLine={true}
                animationDuration={1000}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [Number(value).toLocaleString(), '']}
                labelFormatter={(label) => `${toTitleCase(config.xKey)}: ${label}`}
              />
              {config.legend && <Legend wrapperStyle={{ paddingTop: 20 }} />}
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return <div>Unsupported chart type: {config.type}</div>;
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <h3 className="text-lg font-medium mb-2">{config.title}</h3>
      {renderChart()}
      <div className="mt-4 text-sm text-gray-600 max-w-full px-4">
        <p>{config.description}</p>
        <p className="mt-2 font-medium">{config.takeaway}</p>
      </div>
    </div>
  );
}