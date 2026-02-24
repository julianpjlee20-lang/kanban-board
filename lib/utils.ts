import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case '高':
      return 'text-high bg-high/10'
    case '中':
      return 'text-medium bg-medium/10'
    case '低':
      return 'text-low bg-low/10'
    default:
      return 'text-gray-400 bg-gray-400/10'
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case '待辦':
      return 'border-gray-500'
    case '進行中':
      return 'border-primary'
    case '審核':
      return 'border-medium'
    case '完成':
      return 'border-low'
    default:
      return 'border-gray-500'
  }
}
