from django.utils import timezone

from tasks.models import Task, TaskStatusHistory


def set_task_status(task: Task, new_status: str, changed_by, notes: str = "", approved_by=None) -> Task:
    old_status = task.status
    if old_status == new_status and not notes:
        return task

    task.status = new_status
    update_fields = ["status", "updated_at"]
    if new_status == Task.Status.COMPLETED:
        task.completed_at = timezone.now()
        task.approved_by = approved_by or changed_by
        update_fields.extend(["completed_at", "approved_by"])
    elif old_status == Task.Status.COMPLETED and new_status != Task.Status.COMPLETED:
        task.completed_at = None
        task.approved_by = None
        update_fields.extend(["completed_at", "approved_by"])

    task.save(update_fields=update_fields)
    TaskStatusHistory.objects.create(
        task=task,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        notes=notes,
    )
    return task
