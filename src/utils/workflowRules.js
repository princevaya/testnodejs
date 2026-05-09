const ALLOWED_STATUS_VALUES = ["Pending", "In Progress", "Resolve Requested", "Resolved"];

const TRANSITIONS_BY_ROLE = {
  Admin: {
    Pending: ["In Progress"],
    "In Progress": ["Pending", "Resolve Requested"],
    "Resolve Requested": ["In Progress", "Resolved"],
    Resolved: ["In Progress"]
  },
  Staff: {
    Pending: [],
    "In Progress": ["Resolve Requested"],
    "Resolve Requested": []
  }
};

const canAssignComplaint = (status) => status !== "Resolved";

const validateStatusTransition = ({
  currentStatus,
  nextStatus,
  role,
  isAssignedToStaff = false,
  hasAssignee = false
}) => {
  if (!ALLOWED_STATUS_VALUES.includes(nextStatus)) {
    return { valid: false, message: "Invalid complaint status" };
  }

  if (currentStatus === nextStatus) {
    return { valid: true };
  }

  if ((nextStatus === "In Progress" || nextStatus === "Resolve Requested" || nextStatus === "Resolved") && !hasAssignee) {
    return { valid: false, message: "Assign complaint before moving it beyond Pending" };
  }

  const transitions = TRANSITIONS_BY_ROLE[role] || {};
  const allowedNextStatuses = transitions[currentStatus] || [];
  if (!allowedNextStatuses.includes(nextStatus)) {
    return {
      valid: false,
      message: `Workflow violation: cannot move complaint from ${currentStatus} to ${nextStatus}`
    };
  }

  if (role === "Staff" && !isAssignedToStaff) {
    return { valid: false, message: "You can only update complaints assigned to you" };
  }

  return { valid: true };
};

module.exports = {
  ALLOWED_STATUS_VALUES,
  canAssignComplaint,
  validateStatusTransition
};