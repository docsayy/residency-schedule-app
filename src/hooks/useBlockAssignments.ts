import { useEffect, useState } from "react";
import type { BlockAssignment } from "../types/blockAssignment";
import {
  createBlockAssignment,
  deleteBlockAssignmentById,
  getBlockAssignments,
  updateBlockAssignment,
} from "../services/blockAssignmentService";

export function useBlockAssignments() {
  const [assignments, setAssignments] = useState<BlockAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAssignments() {
    try {
      setLoading(true);
      setError("");
      const data = await getBlockAssignments();
      setAssignments(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load block assignments.");
    } finally {
      setLoading(false);
    }
  }

  async function addAssignment(assignment: Omit<BlockAssignment, "id">) {
    try {
      setError("");
      await createBlockAssignment(assignment);
      await loadAssignments();
    } catch (err) {
      console.error(err);
      setError("Unable to add block assignment.");
    }
  }

  async function saveAssignment(assignment: BlockAssignment) {
    try {
      setError("");
      await updateBlockAssignment(assignment);
      await loadAssignments();
    } catch (err) {
      console.error(err);
      setError("Unable to save block assignment.");
    }
  }

  async function removeAssignment(id: string) {
    try {
      setError("");
      await deleteBlockAssignmentById(id);
      await loadAssignments();
    } catch (err) {
      console.error(err);
      setError("Unable to delete block assignment.");
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  return {
    assignments,
    loading,
    error,
    reloadAssignments: loadAssignments,
    addAssignment,
    saveAssignment,
    removeAssignment,
  };
}