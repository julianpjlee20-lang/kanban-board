import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, isCompleted } = body

    const subtask = await prisma.subtask.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(isCompleted !== undefined && { isCompleted }),
      },
    })

    return NextResponse.json(subtask)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update subtask' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.subtask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete subtask' }, { status: 500 })
  }
}
