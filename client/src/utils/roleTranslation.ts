// Role translation utility
export const getRoleDisplay = (role: string): string => {
  const roleMap: { [key: string]: string } = {
    leader: "Trưởng Clan",
    organizer: "Ban Tổ Chức",
    moderator: "Quản Trị Viên",
    member: "Thành Viên",
  };
  return roleMap[role] || role;
};

export const getRoleIcon = (role: string): string => {
  const iconMap: { [key: string]: string } = {
    leader: "👑",
    organizer: "📋",
    moderator: "🛡️",
    member: "👤",
  };
  return iconMap[role] || "👤";
};
