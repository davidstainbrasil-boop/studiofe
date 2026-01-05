
import { NextResponse } from 'next/server';

// Mock database (in-memory)
let jobs = [
  {
    id: 'job-123',
    project_id: 'Project Alpha',
    status: 'processing',
    priority: 'high',
    type: 'video',
    progress: 45,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    estimated_duration: 300,
  },
  {
    id: 'job-124',
    project_id: 'Training Video Q1',
    status: 'completed',
    priority: 'normal',
    type: 'video',
    progress: 100,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    estimated_duration: 120,
    completed_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'job-125',
    project_id: 'Safety Intro',
    status: 'pending',
    priority: 'low',
    type: 'audio',
    progress: 0,
    created_at: new Date().toISOString(),
    estimated_duration: 60,
  }
];

export async function GET(request: Request) {
  // Simulate processing progress
  jobs = jobs.map(job => {
    if (job.status === 'processing') {
      const newProgress = Math.min(100, job.progress + Math.random() * 10);
      return {
        ...job,
        progress: newProgress,
        status: newProgress >= 100 ? 'completed' : 'processing'
      };
    }
    return job;
  });

  return NextResponse.json({
    pending: jobs.filter(j => j.status === 'pending'),
    processing: jobs.filter(j => j.status === 'processing'),
    completed: jobs.filter(j => j.status === 'completed'),
    failed: [],
    total_jobs: jobs.length,
    average_wait_time: 45,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const newJob = {
    id: `job-${Date.now()}`,
    project_id: body.project_id || 'Untitled Project',
    status: 'pending',
    priority: body.priority || 'normal',
    type: body.render_type || 'video',
    progress: 0,
    created_at: new Date().toISOString(),
    estimated_duration: 180, // Mock duration
  };

  // jobs.push(newJob); // In a real app, this would persist. 
  // For this mock, we'll just return it as if created, but since it's an API route without persistent storage across reloads in dev mode sometimes, we might not see it persist unless we use a global variable carefully or just accept it's a demo.
  // Actually, let's push to the module-level variable. It will persist as long as the lambda/server is hot.
  jobs.unshift(newJob);

  return NextResponse.json({ data: newJob });
}
