import React, { useState, useMemo } from "react";
import { Box, Text, Button, Modal, Icon, Input } from "zmp-ui";
import { useRecoilValue } from "recoil";
import { userListState } from "../../state";
import { departments } from "../../constants/departments";

interface Props {
  visible: boolean;
  value: string[];
  onChange: (val: string[]) => void;
  onClose: () => void;
  title?: string;
}

export const UserSelectModal: React.FC<Props> = ({ visible, value, onChange, onClose, title = "Chọn nhân sự" }) => {
  const users = useRecoilValue(userListState);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [localValue, setLocalValue] = useState<string[]>([]);

  // Reset local value when modal opens
  React.useEffect(() => {
    if (visible) {
      setLocalValue(value);
      setSearchQuery("");
    }
  }, [visible, value]);

  const toggleDept = (deptId: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const toggleUser = (userId: string) => {
    setLocalValue(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = () => {
    onChange(localValue);
    onClose();
  };

  const groupedUsers = useMemo(() => {
    const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, typeof users> = {};
    filteredUsers.forEach(u => {
      const deptId = u.departmentId || 'other';
      if (!groups[deptId]) groups[deptId] = [];
      groups[deptId].push(u);
    });
    return groups;
  }, [users, searchQuery]);

  return (
    <Modal
      visible={visible}
      title={title}
      onClose={onClose}
      actions={[
        { text: "Hủy", close: true },
        { text: "Xác nhận", highLight: true, onClick: handleSave }
      ]}
    >
      <Box className="p-4 flex flex-col h-[60vh]">
        <Input.Search 
          placeholder="Tìm kiếm nhân sự..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />
        <Box className="flex-1 overflow-y-auto space-y-2">
          {departments.map(dept => {
            const deptUsers = groupedUsers[dept.id];
            if (!deptUsers || deptUsers.length === 0) return null;

            const isExpanded = expandedDepts[dept.id] || searchQuery.length > 0;
            // Check if all users in this dept are selected
            const allSelected = deptUsers.length > 0 && deptUsers.every(u => localValue.includes(u.id));
            const someSelected = deptUsers.some(u => localValue.includes(u.id));

            return (
              <Box key={dept.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <Box 
                  className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleDept(dept.id)}
                >
                  <Box className="flex items-center space-x-2">
                    <Box 
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        allSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (allSelected) {
                          // deselect all in dept
                          setLocalValue(prev => prev.filter(id => !deptUsers.find(u => u.id === id)));
                        } else {
                          // select all in dept
                          const newIds = deptUsers.map(u => u.id).filter(id => !localValue.includes(id));
                          setLocalValue(prev => [...prev, ...newIds]);
                        }
                      }}
                    >
                      {allSelected && <Icon icon="zi-check" className="text-white text-xs" />}
                      {!allSelected && someSelected && <Box className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />}
                    </Box>
                    <Text className="font-semibold text-gray-800">{dept.name}</Text>
                  </Box>
                  <Icon icon={isExpanded ? "zi-chevron-up" : "zi-chevron-down"} className="text-gray-500" />
                </Box>
                
                {isExpanded && (
                  <Box className="bg-white p-2">
                    {deptUsers.map(u => {
                      const isSelected = localValue.includes(u.id);
                      return (
                        <Box 
                          key={u.id} 
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          onClick={() => toggleUser(u.id)}
                        >
                          <Box className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {isSelected && <Icon icon="zi-check" className="text-white text-xs" />}
                          </Box>
                          <Box>
                            <Text className={`font-medium ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{u.name}</Text>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Modal>
  );
};
