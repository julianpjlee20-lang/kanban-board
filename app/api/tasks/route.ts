import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')

    const where: any = {}
    if (status) where.status = status
    if (projectId) where.projectId = projectId

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: true,
        assignee: true,
        subtasks: true,
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, status, priority, projectId, assigneeId, dueDate } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || '待辦',
        priority: priority || '中',
        projectId,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        project: true,
        assignee: true,
        subtasks: true,
        attachments: true,
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}
