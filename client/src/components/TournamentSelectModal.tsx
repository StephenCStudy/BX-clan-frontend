import { useEffect, useState } from "react";
import { http } from "../utils/http";
import { toast } from "react-toastify";

// News item with type="room-creation" that links to a tournament
interface TournamentNews {
  _id: string;
  title: string;
  content?: string;
  type: string;
  createdAt: string;
  tournament?: {
    _id: string;
    name: string;
    description?: string;
    gameType: string;
    gameMode: string;
    defaultBestOf: number;
    maxTeams: number;
    teamSize: number;
    status: string;
    currentRound: number;
    registeredTeams: any[];
  };
}

// Tournament data passed to parent
interface Tournament {
  _id: string;
  name: string;
  description?: string;
  gameType: string;
  gameMode: string;
  defaultBestOf: number;
  maxTeams: number;
  teamSize: number;
  status: string;
  currentRound: number;
  startDate?: string;
  endDate?: string;
  registeredTeams: any[];
  // Reference to news
  newsId?: string;
  newsTitle?: string;
}

interface TournamentSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (tournament: Tournament) => void;
}

export default function TournamentSelectModal({
  open,
  onClose,
  onSelect,
}: TournamentSelectModalProps) {
  const [tournamentNews, setTournamentNews] = useState<TournamentNews[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      loadTournamentNews();
    }
  }, [open]);

  const loadTournamentNews = async () => {
    setLoading(true);
    try {
      // Lấy news có type="room-creation"
      const res = await http.get("/news/for-room-creation");
      setTournamentNews(res.data);
    } catch (err) {
      toast.error("Lỗi tải danh sách giải đấu");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = tournamentNews.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.tournament?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item: TournamentNews) => {
    if (!item.tournament) {
      // Nếu không có tournament link, tạo tournament giả từ news
      const fakeTournament: Tournament = {
        _id: item._id,
        name: item.title,
        description: item.content,
        gameType: "lol",
        gameMode: "5vs5",
        defaultBestOf: 3,
        maxTeams: 16,
        teamSize: 5,
        status: "ongoing",
        currentRound: 1,
        registeredTeams: [],
        newsId: item._id,
        newsTitle: item.title,
      };
      onSelect(fakeTournament);
    } else {
      // Nếu có tournament, dùng tournament data
      const tournament: Tournament = {
        ...item.tournament,
        newsId: item._id,
        newsTitle: item.title,
      };
      onSelect(tournament);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl max-w-lg w-full flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-trophy text-yellow-500"></i>
            Chọn Giải Đấu
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Chọn bài viết tạo phòng để tạo trận đấu
          </p>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Tìm kiếm giải đấu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
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
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fa-solid fa-trophy text-4xl mb-2 opacity-50"></i>
              <p>Không có giải đấu nào</p>
              <p className="text-xs mt-1">
                Tạo bài viết với type "Tạo phòng" để bắt đầu
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <button
                  key={item._id}
                  onClick={() => handleSelect(item)}
                  className="w-full text-left p-4 bg-gray-50 hover:bg-yellow-50 border-2 border-gray-200 hover:border-yellow-400 rounded-lg transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <i className="fa-solid fa-trophy text-yellow-500"></i>
                        {item.title}
                      </h4>
                      {item.content && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {item.content.substring(0, 100)}...
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.tournament ? (
                          <>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              Đang diễn ra
                            </span>
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                              Vòng {item.tournament.currentRound}
                            </span>
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                              {item.tournament.registeredTeams?.length || 0}/
                              {item.tournament.maxTeams} đội
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                              BO{item.tournament.defaultBestOf}
                            </span>
                          </>
                        ) : (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                            Giải đấu thủ công
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-gray-400 mt-1"></i>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
