// Rank color mappings
export const getRankColors = (rank: string) => {
  const rankColors: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    Đồng: {
      bg: "bg-linear-to-br from-orange-900 to-orange-800",
      border: "border-orange-900",
      text: "text-orange-100",
    },
    Bạc: {
      bg: "bg-linear-to-br from-gray-400 to-gray-500",
      border: "border-gray-500",
      text: "text-gray-50",
    },
    Vàng: {
      bg: "bg-linear-to-br from-yellow-400 to-yellow-500",
      border: "border-yellow-500",
      text: "text-yellow-900",
    },
    "Bạch Kim": {
      bg: "bg-linear-to-br from-cyan-400 to-cyan-600",
      border: "border-cyan-600",
      text: "text-cyan-50",
    },
    "Lục Bảo": {
      bg: "bg-linear-to-br from-emerald-500 to-emerald-700",
      border: "border-emerald-700",
      text: "text-emerald-50",
    },
    "Kim Cương": {
      bg: "bg-linear-to-br from-blue-400 to-blue-600",
      border: "border-blue-600",
      text: "text-blue-50",
    },
    "Cao Thủ": {
      bg: "bg-linear-to-br from-purple-500 to-purple-700",
      border: "border-purple-700",
      text: "text-purple-50",
    },
    "Đại Cao Thủ": {
      bg: "bg-linear-to-br from-red-500 to-red-700",
      border: "border-red-700",
      text: "text-red-50",
    },
    "Thách Đấu": {
      bg: "bg-linear-to-br from-yellow-300 via-yellow-400 to-amber-500",
      border: "border-amber-500",
      text: "text-amber-900",
    },
    "Tối Cao": {
      bg: "bg-linear-to-br from-pink-500 via-purple-600 to-indigo-700",
      border: "border-indigo-700",
      text: "text-white",
    },
  };

  return (
    rankColors[rank] || {
      bg: "bg-linear-to-br from-gray-100 to-gray-200",
      border: "border-gray-300",
      text: "text-gray-700",
    }
  );
};

// Lane color mappings
export const getLaneColors = (lane: string) => {
  const laneColors: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
    Baron: {
      bg: "bg-linear-to-br from-slate-700 to-slate-900",
      border: "border-slate-900",
      text: "text-slate-100",
    },
    Rừng: {
      bg: "bg-linear-to-br from-green-700 to-green-900",
      border: "border-green-900",
      text: "text-green-100",
    },
    Giữa: {
      bg: "bg-linear-to-br from-purple-600 to-purple-800",
      border: "border-purple-800",
      text: "text-purple-100",
    },
    Rồng: {
      bg: "bg-linear-to-br from-red-600 to-red-800",
      border: "border-red-800",
      text: "text-red-100",
    },
    "Hỗ Trợ": {
      bg: "bg-linear-to-br from-teal-600 to-teal-800",
      border: "border-teal-800",
      text: "text-teal-100",
    },
  };

  // Handle multiple lanes (e.g., "Baron, Rừng")
  const firstLane = lane.split(",")[0].trim();
  return (
    laneColors[firstLane] || {
      bg: "bg-linear-to-br from-gray-100 to-gray-200",
      border: "border-gray-300",
      text: "text-gray-700",
    }
  );
};
