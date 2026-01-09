
import { NextResponse } from 'next/server';

export async function GET() {
  // Mock random stats
  const cpu = 30 + Math.random() * 40; // 30-70%
  const memory = 40 + Math.random() * 20; // 40-60%
  
  return NextResponse.json({
    total_renders: 1542,
    success_rate: 98.5,
    performance_metrics: {
      average_cpu_usage: cpu,
      average_memory_usage: memory,
      average_gpu_usage: cpu - 10,
    }
  });
}
