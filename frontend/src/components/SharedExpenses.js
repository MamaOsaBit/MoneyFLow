import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import axios from 'axios';
import { 
  Users, 
  Plus, 
  UserPlus, 
  DollarSign, 
  Calendar,
  Share2,
  Mail,
  User,
  Check,
  X
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SharedExpenses = () => {
  const { user } = useContext(AuthContext);
  const [sharedExpenses, setSharedExpenses] = useState([]);
  const [sharedGroups, setSharedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    member_emails: []
  });
  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    fetchSharedData();
  }, []);

  const fetchSharedData = async () => {
    try {
      const [expensesResponse, groupsResponse] = await Promise.all([
        axios.get(`${API}/expenses`),
        axios.get(`${API}/shared-groups`)
      ]);
      
      // Filter for shared expenses only
      const shared = expensesResponse.data.filter(expense => expense.type === 'shared');
      setSharedExpenses(shared);
      setSharedGroups(groupsResponse.data);
    } catch (error) {
      console.error('Error fetching shared data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMemberEmail = () => {
    if (memberEmail.trim() && !newGroup.member_emails.includes(memberEmail.trim())) {
      setNewGroup(prev => ({
        ...prev,
        member_emails: [...prev.member_emails, memberEmail.trim()]
      }));
      setMemberEmail('');
    }
  };

  const removeMemberEmail = (email) => {
    setNewGroup(prev => ({
      ...prev,
      member_emails: prev.member_emails.filter(e => e !== email)
    }));
  };

  const createGroup = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/shared-groups`, newGroup);
      setNewGroup({ name: '', member_emails: [] });
      setShowCreateGroup(false);
      fetchSharedData();
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateUserShare = (expense) => {
    if (expense.user_id === user.id) {
      return expense.amount; // User created this expense
    } else {
      // User is part of this shared expense
      const shareCount = expense.shared_with.length + 1; // +1 for the creator
      return expense.amount / shareCount;
    }
  };

  const getTotalSharedAmount = () => {
    return sharedExpenses.reduce((total, expense) => {
      return total + calculateUserShare(expense);
    }, 0);
  };

  const getUserCreatedAmount = () => {
    return sharedExpenses
      .filter(expense => expense.user_id === user.id)
      .reduce((total, expense) => total + expense.amount, 0);
  };

  const getUserOwedAmount = () => {
    return sharedExpenses
      .filter(expense => expense.user_id !== user.id)
      .reduce((total, expense) => {
        const shareCount = expense.shared_with.length + 1;
        return total + (expense.amount / shareCount);
      }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Shared Expenses</h1>
            <p className="text-slate-400">Manage expenses with friends and family</p>
          </div>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="mt-4 md:mt-0 px-4 py-2 glass-button flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">Your Share</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(getTotalSharedAmount())}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-teal-500 rounded-xl flex items-center justify-center">
                <Share2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-green-400 text-sm">Total amount you're responsible for</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">You Paid</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(getUserCreatedAmount())}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-blue-400 text-sm">Expenses you created</p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400 text-sm">You Owe</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(getUserOwedAmount())}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-orange-400 text-sm">Your share of others' expenses</p>
          </div>
        </div>

        {/* Shared Groups */}
        {sharedGroups.length > 0 && (
          <div className="glass-card p-6 rounded-xl mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Your Groups</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedGroups.map(group => (
                <div key={group.id} className="glass p-4 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{group.name}</h4>
                      <p className="text-sm text-slate-400">{group.members.length} members</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Created {formatDate(group.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shared Expenses List */}
        <div className="glass-card p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-6">Recent Shared Expenses</h3>
          
          {sharedExpenses.length > 0 ? (
            <div className="space-y-4">
              {sharedExpenses.map(expense => (
                <div key={expense.id} className="glass p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-teal-500 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">
                          {expense.description || expense.category}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-slate-400">
                          <span>{expense.category}</span>
                          <span>•</span>
                          <span>{formatDate(expense.date)}</span>
                          <span>•</span>
                          <span>{expense.shared_with.length + 1} people</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-semibold text-white">
                        {formatCurrency(expense.amount)}
                      </p>
                      <p className="text-sm text-green-400">
                        Your share: {formatCurrency(calculateUserShare(expense))}
                      </p>
                      <p className="text-xs text-slate-400">
                        {expense.user_id === user.id ? 'You paid' : 'Paid by someone else'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">No Shared Expenses</h4>
              <p className="text-slate-400 mb-6">
                Start by adding a shared expense to split costs with others
              </p>
            </div>
          )}
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-card p-6 rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Create Shared Group</h3>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={createGroup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 glass-input"
                    placeholder="e.g., Roommates, Vacation Trip"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Add Members
                  </label>
                  <div className="flex space-x-2 mb-2">
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      className="flex-1 px-4 py-3 glass-input"
                      placeholder="Enter email address"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMemberEmail())}
                    />
                    <button
                      type="button"
                      onClick={addMemberEmail}
                      className="px-4 py-3 glass-button"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {newGroup.member_emails.length > 0 && (
                    <div className="space-y-2">
                      {newGroup.member_emails.map(email => (
                        <div key={email} className="flex items-center justify-between p-2 glass rounded">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-slate-400" />
                            <span className="text-white text-sm">{email}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMemberEmail(email)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 px-4 py-3 border border-white/20 rounded-lg text-slate-300 hover:text-white hover:border-white/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 glass-button"
                  >
                    Create Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedExpenses;