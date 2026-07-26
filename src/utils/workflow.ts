import { Document, DocumentHistory } from '../types/document';

export function isUserBranchCompleted(document: Document, userId: string, departmentId?: string): 'processing' | 'completed' | 'waiting_reply' {
  const history = document.history || [];
  
  // 1. Find when this user was last assigned/received the document
  // History is sorted newest first.
  const targetDeptId = departmentId || userId;
  const receivedEventIndex = history.findIndex(h => 
    (!h.isReturn) && (h.targetUserIds?.includes(userId) || h.assigneeId === userId || h.reporterIds?.includes(userId) || h.targetDepartmentIds?.some(id => id.toLowerCase() === targetDeptId.toLowerCase()))
  );
  
  const isCreator = document.creatorId === userId;
  if (receivedEventIndex === -1 && !isCreator) return 'completed'; // Not involved
  
  // 2. Find the user's latest action
  const latestActionIndex = history.findIndex(h => h.actorId === userId);
  
  if (latestActionIndex === -1) {
     return 'processing'; // Received but took no action
  }
  
  const latestAction = history[latestActionIndex];
  
  // 3. Find if the user delegated it AFTER receiving it.
  // Because history is newest first, delegation index must be < receivedEventIndex.
  const latestDelegationIndex = history.findIndex((h, i) => 
    h.actorId === userId && (
      ['assign', 'forward_info'].includes(h.action) || 
      (!h.isReturn && ['submit', 'approve'].includes(h.action) && ((h.targetUserIds && h.targetUserIds.length > 0) || (h.targetDepartmentIds && h.targetDepartmentIds.length > 0)))
    )
  );
  
  let allDelegatesDone = true;
  let lastDelegateFinishTime = 0;
  
  // If user delegated it after receiving it
  if (latestDelegationIndex !== -1 && (receivedEventIndex === -1 || latestDelegationIndex < receivedEventIndex)) {
     const delegationEvent = history[latestDelegationIndex];
     const delegates = [...(delegationEvent.targetUserIds || []), ...(delegationEvent.targetDepartmentIds || [])];
     
     if (delegates.length > 0) {
       for (const delegateId of delegates) {
          // Find delegate's latest action AFTER the delegation
          // Note: for targetDepartmentIds, this might be tricky, but we assume the department's users will process it.
          // Wait, if it's a department, we should check if ANY user in that department finished it?
          // For simplicity, let's just check if ANY action was taken by someone in that department?
          // Actually, our delegates array might only have userIds if targetUserIds was populated.
          // Let's combine both user targets and dept targets if needed.
          const delegateActionIndex = history.findIndex((h, i) => {
             const isFromDelegate = h.actorId === delegateId || h.senderDepartmentId === delegateId;
             if (!isFromDelegate || i >= latestDelegationIndex) return false;
             
             // The action must be a completion or a return
             return ['complete', 'approve', 'reject'].includes(h.action) || (h.action === 'submit' && h.isReturn === true);
          });
          
          if (delegateActionIndex === -1) {
             allDelegatesDone = false; // Delegate hasn't done anything terminal yet
             break;
          }
          
          const delegateAction = history[delegateActionIndex];
          // We know it's a completion event now because of the findIndex condition
          const actionTime = new Date(delegateAction.timestamp).getTime();
          if (actionTime > lastDelegateFinishTime) {
             lastDelegateFinishTime = actionTime;
          }
       }
     }
  }
  
  if (!allDelegatesDone) {
     return 'processing';
  }
  
  // All delegates (if any) are done. 
  // Did the user take a terminal action AFTER the last delegate finished?
  // (Or if no delegates, is their latest action terminal and after they received it?)
  const terminalActions = ['complete', 'approve', 'reject', 'submit'];
  if (terminalActions.includes(latestAction.action)) {
     // Ensure this action is AFTER the user received the document
     if (receivedEventIndex !== -1 && latestActionIndex > receivedEventIndex) {
         return 'processing';
     }

     // Ensure this action is AFTER the delegation (if any)
     if (latestDelegationIndex !== -1 && latestActionIndex > latestDelegationIndex) {
         // This means the terminal action happened BEFORE the delegation!
         // So they are currently processing the delegation.
         return 'processing';
     }
     
     const latestActionTime = new Date(latestAction.timestamp).getTime();
     if (latestActionTime >= lastDelegateFinishTime) {
        return 'completed';
     }
  }
  
  if (allDelegatesDone && latestDelegationIndex !== -1 && (receivedEventIndex === -1 || latestDelegationIndex < receivedEventIndex)) {
     return 'waiting_reply';
  }
  
  return 'processing';
}

export function getBranchStatus(document: Document, userId: string, departmentId?: string) {
    if (document.trangThai === 'completed') return 'completed';
    return isUserBranchCompleted(document, userId, departmentId);
}
