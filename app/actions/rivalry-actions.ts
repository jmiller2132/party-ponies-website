"use server"

import { getHeadToHeadRecord as getHeadToHeadRecordUtil, getAllManagers } from "@/lib/manager-utils"

/**
 * Server Action to get head-to-head record between two managers
 */
export async function getHeadToHeadRecord(manager1: string, manager2: string) {
  try {
    const record = await getHeadToHeadRecordUtil(manager1, manager2)
    return { success: true, data: record }
  } catch (error) {
    console.error("Error fetching head-to-head record:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch head-to-head record",
      data: null,
    }
  }
}
