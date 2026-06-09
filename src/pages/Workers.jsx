import { useState } from "react";
import { supabase } from "@/api/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import WorkerForm from "@/components/workers/WorkerForm";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Workers() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [deleteWorker, setDeleteWorker] = useState(null);
  const queryClient = useQueryClient();

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("worker").select("*");
      if (error) throw error;
      return [...(data ?? [])].sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));
    },
  });

  const createWorker = useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase.from("worker").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });

  const updateWorker = useMutation({
    mutationFn: async ({ id, data: values }) => {
      const { data, error } = await supabase.from("worker").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("worker").delete().eq("id", id);
      if (error) throw error;
      return { id };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workers"] }),
  });

  const handleSave = (data) => {
    if (editingWorker) {
      updateWorker.mutate({ id: editingWorker.id, data });
    } else {
      createWorker.mutate(data);
    }
    setEditingWorker(null);
  };

  const handleEdit = (worker) => {
    setEditingWorker(worker);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingWorker(null);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (deleteWorker) {
      deleteWorkerMutation.mutate(deleteWorker.id);
      setDeleteWorker(null);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(workers);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    // Optimistically update cache
    queryClient.setQueryData(["workers"], reordered);
    // Persist new sort_order for each moved worker
    reordered.forEach((w, idx) => {
      if (w.sort_order !== idx) {
        updateWorker.mutate({ id: w.id, data: { sort_order: idx } });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Workers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your team and their regular work days</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Worker
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="workers" direction="vertical">
          {(provided) => (
            <div
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {workers.map((worker, index) => (
                <Draggable key={worker.id} draggableId={worker.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      <Card className={cn("p-4 transition-shadow", snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-md")}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: worker.color || "#4F46E5" }}
                            >
                              {worker.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{worker.name}</p>
                              {worker.role && <p className="text-xs text-muted-foreground">{worker.role}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(worker)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteWorker(worker)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-3 ml-7">
                          {DAY_LABELS.map((label, i) => (
                            <span
                              key={i}
                              className={cn(
                                "w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-semibold",
                                worker.work_days?.includes(i)
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground/40"
                              )}
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {!isLoading && workers.length === 0 && (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No workers yet. Add your first team member!</p>
          <Button className="mt-4" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Worker
          </Button>
        </div>
      )}

      <WorkerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        worker={editingWorker}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteWorker} onOpenChange={() => setDeleteWorker(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Worker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteWorker?.name}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}