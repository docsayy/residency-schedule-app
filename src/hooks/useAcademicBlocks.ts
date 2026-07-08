import { useEffect, useState } from "react";
import type { AcademicBlock } from "../types/block";
import {
  getAcademicBlocks,
  saveAcademicBlocks,
} from "../services/blockService";

export function useAcademicBlocks() {
  const [blocks, setBlocks] = useState<AcademicBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBlocks() {
    try {
      setLoading(true);
      setError("");
      const data = await getAcademicBlocks();
      setBlocks(data);
    } catch (err) {
      console.error(err);
      setError("Unable to load academic blocks.");
    } finally {
      setLoading(false);
    }
  }

  async function saveBlocks(blocksToSave: AcademicBlock[]) {
    try {
      setError("");
      await saveAcademicBlocks(blocksToSave);
      await loadBlocks();
    } catch (err) {
      console.error(err);
      setError("Unable to save academic blocks.");
    }
  }

  useEffect(() => {
    loadBlocks();
  }, []);

  return {
    blocks,
    loading,
    error,
    reloadBlocks: loadBlocks,
    saveBlocks,
  };
}