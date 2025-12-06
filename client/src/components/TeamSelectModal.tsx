import React, { useEffect, useState } from "react";
import { http } from "../utils/http";
import { toast } from "react-toastify";

interface TeamMember {
  user: {
    _id: string;
    username: string;
    ingameName: string;
    avatarUrl?: string;
  };
  role: string;
  position: string;
}

interface Team {
  _id: string;
  name: string;
  tag?: string;
  logoUrl?: string;
  members: TeamMember[];
  tournamentStatus: string;
}

interface WinningTeamsData {
  currentRound: number;
  allAvailableTeams: Team[];
  teamsNotInMatch: Team[];
  totalTeamsInRound: number;
}

interface TeamSelectModalProps {
  open: boolean;
  tournamentId: string;
  onClose: () => void;
  onSelect: (team1: Team, team2: Team) => void;
}

export default function TeamSelectModal({
  open,
  tournamentId,
  onClose,
  onSelect,
}: TeamSelectModalProps) {
  const [teamsData, setTeamsData] = useState<WinningTeamsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTeam1, setSelectedTeam1] = useState<Team | null>(null);
  const [selectedTeam2, setSelectedTeam2] = useState<Team | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && tournamentId) {
      loadWinningTeams();
      // Reset selections khi mở modal
      setSelectedTeam1(null);
      setSelectedTeam2(null);
      setSearch("");
    }
  }, [open, tournamentId]);

  const loadWinningTeams = async () => {
    setLoading(true);
    try {
      const res = await http.get(`/tournaments/${tournamentId}/winning-teams`);
      setTeamsData(res.data);
    } catch (err) {
      toast.error("Lỗi tải danh sách team");
    } finally {
      setLoading(false);
    }
  };

  const availableTeams = teamsData?.teamsNotInMatch || [];

  const filteredTeams = availableTeams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tag?.toLowerCase().includes(search.toLowerCase())
  );

  const handleTeamClick = (team: Team) => {
    if (selectedTeam1?._id === team._id) {
      // Bỏ chọn team 1
      setSelectedTeam1(null);
    } else if (selectedTeam2?._id === team._id) {
      // Bỏ chọn team 2
      setSelectedTeam2(null);
    } else if (!selectedTeam1) {
      // Chọn team 1
      setSelectedTeam1(team);
    } else if (!selectedTeam2) {
      // Chọn team 2
      setSelectedTeam2(team);
    } else {
      toast.warning("Đã chọn đủ 2 team. Bỏ chọn 1 team để chọn lại.");
    }
  };

  const handleConfirm = () => {
    if (selectedTeam1 && selectedTeam2) {
      onSelect(selectedTeam1, selectedTeam2);
      onClose();
    }
  };

  const getTeamSelectionState = (team: Team) => {
    if (selectedTeam1?._id === team._id) return "team1";
    if (selectedTeam2?._id === team._id) return "team2";
    return null;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl max-w-2xl w-full flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-users text-blue-500"></i>
            Chọn 2 Team Thi Đấu
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Vòng {teamsData?.currentRound || 1} - Có {availableTeams.length}{" "}
            team chưa có trận đấu
          </p>

          {/* Selected Teams Preview */}
          {(selectedTeam1 || selectedTeam2) && (
            <div className="mt-4 flex items-center justify-center gap-4 p-3 bg-gray-50 rounded-lg">
              {/* Team 1 */}
              <div
                className={`flex-1 text-center p-3 rounded-lg border-2 ${
                  selectedTeam1
                    ? "border-red-400 bg-red-50"
                    : "border-dashed border-gray-300"
                }`}
              >
                {selectedTeam1 ? (
                  <div className="flex items-center justify-center gap-2">
                    {selectedTeam1.logoUrl && (
                      <img
                        src={selectedTeam1.logoUrl}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="font-semibold text-red-700">
                      {selectedTeam1.tag || selectedTeam1.name}
                    </span>
                    <button
                      onClick={() => setSelectedTeam1(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400">Chọn Team 1</span>
                )}
              </div>

              {/* VS */}
              <div className="font-bold text-gray-500 text-lg">VS</div>

              {/* Team 2 */}
              <div
                className={`flex-1 text-center p-3 rounded-lg border-2 ${
                  selectedTeam2
                    ? "border-blue-400 bg-blue-50"
                    : "border-dashed border-gray-300"
                }`}
              >
                {selectedTeam2 ? (
                  <div className="flex items-center justify-center gap-2">
                    {selectedTeam2.logoUrl && (
                      <img
                        src={selectedTeam2.logoUrl}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="font-semibold text-blue-700">
                      {selectedTeam2.tag || selectedTeam2.name}
                    </span>
                    <button
                      onClick={() => setSelectedTeam2(null)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400">Chọn Team 2</span>
                )}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Tìm kiếm team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
              <p>Đang tải...</p>
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fa-solid fa-users-slash text-4xl mb-2 opacity-50"></i>
              <p>Không có team nào khả dụng</p>
              {teamsData?.allAvailableTeams &&
                teamsData.allAvailableTeams.length > 0 && (
                  <p className="text-sm mt-2">
                    Tất cả team trong vòng này đã có trận đấu
                  </p>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTeams.map((team) => {
                const selectionState = getTeamSelectionState(team);
                return (
                  <button
                    key={team._id}
                    onClick={() => handleTeamClick(team)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      selectionState === "team1"
                        ? "border-red-500 bg-red-50 ring-2 ring-red-200"
                        : selectionState === "team2"
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-200 bg-gray-50 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Team Logo */}
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                        {team.logoUrl ? (
                          <img
                            src={team.logoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <i className="fa-solid fa-users text-gray-400"></i>
                        )}
                      </div>

                      {/* Team Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {team.name}
                          </h4>
                          {team.tag && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                              {team.tag}
                            </span>
                          )}
                        </div>

                        {/* Members */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {team.members?.slice(0, 5).map((member, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border"
                              title={
                                member.user?.ingameName || member.user?.username
                              }
                            >
                              {member.user?.avatarUrl && (
                                <img
                                  src={member.user.avatarUrl}
                                  alt=""
                                  className="w-4 h-4 rounded-full"
                                />
                              )}
                              <span className="truncate max-w-[60px]">
                                {member.user?.ingameName ||
                                  member.user?.username}
                              </span>
                            </div>
                          ))}
                          {team.members && team.members.length > 5 && (
                            <span className="text-xs text-gray-500 px-2 py-1">
                              +{team.members.length - 5}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div className="shrink-0">
                        {selectionState === "team1" && (
                          <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                            Team 1
                          </span>
                        )}
                        {selectionState === "team2" && (
                          <span className="inline-block px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                            Team 2
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!selectedTeam1 || !selectedTeam2}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-check"></i>
            Xác nhận (
            {selectedTeam1 && selectedTeam2
              ? "2/2"
              : selectedTeam1 || selectedTeam2
              ? "1/2"
              : "0/2"}{" "}
            team)
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
