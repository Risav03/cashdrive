'use client';

import { useState } from 'react';
import { FiCopy, FiEdit, FiTrash2, FiExternalLink } from 'react-icons/fi';

interface Affiliate {
  _id: string;
  affiliateCode: string;
  commissionRate: number;
  status: 'active' | 'inactive' | 'suspended';
  totalEarnings: number;
  totalSales: number;
  affiliateUser: {
    _id: string;
    name: string;
    email: string;
  };
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  listing?: {
    _id: string;
    title: string;
    price: number;
  };
  sharedLink?: {
    _id: string;
    title: string;
    price: number;
    type: string;
    linkId: string;
  };
  createdAt: string;
}

interface AffiliateCardProps {
  affiliate: Affiliate;
  currentUserId: string;
  onUpdate?: (affiliateId: string, updates: any) => void;
  onDelete?: (affiliateId: string) => void;
}

export default function AffiliateCard({
  affiliate,
  currentUserId,
  onUpdate,
  onDelete
}: AffiliateCardProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [editCommission, setEditCommission] = useState(affiliate.commissionRate);
  const [editStatus, setEditStatus] = useState(affiliate.status);
  const [loading, setLoading] = useState(false);

  const isOwner = affiliate.owner._id === currentUserId;
  const content = affiliate.listing || affiliate.sharedLink;
  const contentType = affiliate.listing ? 'listing' : 'shared link';
  
  const affiliateUrl = `${window.location.origin}/${affiliate.listing ? 'marketplace' : 'shared'}/${affiliate.listing ? affiliate.listing._id : affiliate.sharedLink?.linkId || ''}?ref=${affiliate.affiliateCode}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const handleUpdate = async () => {
    if (!onUpdate) return;
    
    setLoading(true);
    try {
      await onUpdate(affiliate._id, {
        commissionRate: editCommission,
        status: editStatus
      });
      setShowEditForm(false);
    } catch (error) {
      console.error('Error updating affiliate:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 border-green-300';
      case 'inactive': return 'bg-gray-100 border-gray-300';
      case 'suspended': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="bg-amber-100 border-2 border-black brutal-shadow-left">
      <div className="bg-white border-b-2 border-black p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-anton text-lg mb-1">{content?.title}</h3>
            <p className="font-freeman text-sm text-gray-600 mb-2">
              {contentType} • ${content?.price}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 text-xs font-freeman border-2 border-black ${getStatusColor(affiliate.status)}`}>
                {affiliate.status.toUpperCase()}
              </span>
              <span className="font-freeman text-sm">
                {affiliate.commissionRate}% commission
              </span>
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditForm(!showEditForm)}
                className="p-2 hover:bg-gray-100 transition-colors"
              >
                <FiEdit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete?.(affiliate._id)}
                className="p-2 hover:bg-red-100 transition-colors text-red-600"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="font-anton text-xl">${affiliate.totalEarnings.toFixed(2)}</p>
            <p className="font-freeman text-xs">Total Earnings</p>
          </div>
          <div>
            <p className="font-anton text-xl">{affiliate.totalSales}</p>
            <p className="font-freeman text-xs">Sales</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-3">
          <p className="font-freeman text-sm mb-1">
            {isOwner ? 'Affiliate:' : 'Content Owner:'}
          </p>
          <p className="font-freeman text-sm font-semibold">
            {isOwner ? affiliate.affiliateUser.name : affiliate.owner.name}
          </p>
          <p className="font-freeman text-xs text-gray-600">
            {isOwner ? affiliate.affiliateUser.email : affiliate.owner.email}
          </p>
        </div>

        <div className="mb-3">
          <p className="font-freeman text-sm mb-1">Affiliate Code:</p>
          <div className="flex gap-2">
            <code className="flex-1 px-2 py-1 bg-white border-2 border-black font-mono text-sm">
              {affiliate.affiliateCode}
            </code>
            <button
              onClick={() => copyToClipboard(affiliate.affiliateCode)}
              className="px-2 py-1 border-2 border-black bg-white hover:bg-gray-50"
            >
              <FiCopy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="font-freeman text-sm mb-1">Affiliate URL:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={affiliateUrl}
              readOnly
              className="flex-1 px-2 py-1 bg-white border-2 border-black font-freeman text-xs"
            />
            <button
              onClick={() => copyToClipboard(affiliateUrl)}
              className="px-2 py-1 border-2 border-black bg-white hover:bg-gray-50"
            >
              <FiCopy className="w-4 h-4" />
            </button>
            <button
              onClick={() => window.open(affiliateUrl, '_blank')}
              className="px-2 py-1 border-2 border-black bg-white hover:bg-gray-50"
            >
              <FiExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showEditForm && isOwner && (
          <div className="border-t-2 border-black pt-4 space-y-3">
            <div>
              <label className="block font-freeman text-sm mb-1">
                Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editCommission}
                onChange={(e) => setEditCommission(parseFloat(e.target.value))}
                className="w-full px-2 py-1 border-2 border-black font-freeman focus:outline-none focus:border-[#FFD000]"
              />
            </div>
            <div>
              <label className="block font-freeman text-sm mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-2 py-1 border-2 border-black font-freeman focus:outline-none focus:border-[#FFD000]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditForm(false)}
                className="flex-1 px-3 py-1 border-2 border-black bg-gray-100 font-freeman text-sm hover:translate-x-1 hover:translate-y-1 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="flex-1 button-primary bg-[#FFD000] px-3 py-1 text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}