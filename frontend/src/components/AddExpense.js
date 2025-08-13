import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  Plus, 
  DollarSign, 
  Calendar, 
  Tag, 
  Users, 
  User, 
  FileText,
  Check,
  X
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AddExpense = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'personal',
    description: '',
    shared_with: []
  });

  const [sharedUsers, setSharedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const categories = [
    'Credit Card',
    'Supermarket',
    'Utilities',
    'Rent',
    'Transportation',
    'Entertainment',
    'Healthcare',
    'Dining',
    'Shopping',
    'Subscriptions',
    'Travel',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      type
    }));
    if (type === 'personal') {
      setSharedUsers([]);
      setFormData(prev => ({
        ...prev,
        shared_with: []
      }));
    }
  };

  const searchUser = async (email) => {
    if (!email.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const response = await axios.get(`${API}/users/search?email=${encodeURIComponent(email)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Error searching user:', error);
      setSearchResults({ found: false });
    }
  };

  const addSharedUser = () => {
    if (searchResults?.found && !sharedUsers.find(u => u.id === searchResults.user.id)) {
      const newUser = searchResults.user;
      setSharedUsers(prev => [...prev, newUser]);
      setFormData(prev => ({
        ...prev,
        shared_with: [...prev.shared_with, newUser.id]
      }));
      setUserSearch('');
      setSearchResults(null);
    }
  };

  const removeSharedUser = (userId) => {
    setSharedUsers(prev => prev.filter(u => u.id !== userId));
    setFormData(prev => ({
      ...prev,
      shared_with: prev.shared_with.filter(id => id !== userId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
      };

      await axios.post(`${API}/expenses`, expenseData);
      setSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 rounded-2xl text-center max-w-md w-full success-glow">
          <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Expense Added!</h2>
          <p className="text-slate-400 mb-6">Your expense has been successfully recorded.</p>
          <div className="animate-pulse text-cyan-400">Redirecting to dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Add New Expense</h1>
          <p className="text-slate-400">Track your personal or shared expenses</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Expense Type Selection */}
          <div className="glass-card p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Expense Type</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('personal')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  formData.type === 'personal'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <User className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">Personal</div>
                <div className="text-sm opacity-75">Only for you</div>
              </button>
              
              <button
                type="button"
                onClick={() => handleTypeChange('shared')}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  formData.type === 'shared'
                    ? 'border-green-500 bg-green-500/20 text-green-400'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                }`}
              >
                <Users className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">Shared</div>
                <div className="text-sm opacity-75">With others</div>
              </button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="glass-card p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-4">Expense Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <DollarSign className="inline w-4 h-4 mr-1" />
                  Amount
                </label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-3 glass-input"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Calendar className="inline w-4 h-4 mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 glass-input"
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Tag className="inline w-4 h-4 mr-1" />
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 glass-input"
                required
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <FileText className="inline w-4 h-4 mr-1" />
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-3 glass-input resize-none"
                placeholder="What was this expense for?"
              />
            </div>
          </div>

          {/* Shared Users Section */}
          {formData.type === 'shared' && (
            <div className="glass-card p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-4">Share With</h3>
              
              {/* User Search */}
              <div className="mb-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        searchUser(e.target.value);
                      }}
                      className="w-full px-4 py-3 glass-input"
                      placeholder="Enter email to add user"
                    />
                  </div>
                  {searchResults?.found && (
                    <button
                      type="button"
                      onClick={addSharedUser}
                      className="px-4 py-3 glass-button"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Search Results */}
                {userSearch && searchResults !== null && (
                  <div className="mt-2 p-3 glass rounded-lg">
                    {searchResults.found ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">{searchResults.user.name}</div>
                          <div className="text-slate-400 text-sm">{searchResults.user.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={addSharedUser}
                          className="text-green-400 hover:text-green-300"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm">User not found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected Users */}
              {sharedUsers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-2">Selected Users:</h4>
                  <div className="space-y-2">
                    {sharedUsers.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 glass rounded-lg">
                        <div>
                          <div className="text-white font-medium">{user.name}</div>
                          <div className="text-slate-400 text-sm">{user.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSharedUser(user.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 px-6 py-3 border border-white/20 rounded-lg text-slate-300 hover:text-white hover:border-white/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 glass-button disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Expense</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpense;