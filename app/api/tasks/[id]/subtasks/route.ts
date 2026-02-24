import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const subtask = await prisma.subtask.create({
      data: {
        title,
        taskId: id,
      },
    })

    return NextResponse.json(subtask)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create subtask' }, { status: 500 })
  }
}
