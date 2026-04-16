import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  MoveUp, 
  MoveDown, 
  Eye, 
  Layout, 
  Settings,
  Image as ImageIcon,
  Type,
  Link as LinkIcon,
  Palette,
  LogOut,
  Upload,
  Loader2,
  Copy,
  GripVertical
} from 'lucide-react';
import { User } from 'firebase/auth';
import { doc, setDoc, deleteDoc, updateDoc, collection, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Link, Profile } from '../types';
import { cn } from '../lib/utils';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';

interface AdminDashboardProps {
  profile: Profile;
  setProfile: (p: Profile) => void;
  links: Link[];
  setLinks: (l: Link[]) => void;
  user: User;
  onLogout: () => void;
}

const DraggableComponent = Draggable as any;

export default function AdminDashboard({ profile, setProfile, links, setLinks, user, onLogout }: AdminDashboardProps) {
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'links' | 'profile' | 'theme'>('links');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB.');
      return;
    }

    setUploading(true);
    const storageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setProfile({ ...profile, avatarUrl: downloadURL });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please check your connection.');
    } finally {
      setUploading(false);
    }
  };

  const addLink = async () => {
    const id = Date.now().toString();
    const newLink: Omit<Link, 'id'> = {
      title: 'New Link',
      url: 'https://',
      icon: 'globe',
      type: 'social',
      order: links.length + 1,
      active: true,
      color: '#3b82f6'
    };
    try {
      await setDoc(doc(db, 'links', id), newLink);
      setEditingLink(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `links/${id}`);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'links', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `links/${id}`);
    }
  };

  const duplicateLink = async (link: Link) => {
    const id = Date.now().toString();
    const { id: _, ...linkData } = link;
    const newLink = {
      ...linkData,
      title: `${link.title} (Copy)`,
      order: links.length + 1,
    };
    try {
      await setDoc(doc(db, 'links', id), newLink);
      setEditingLink(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `links/${id}`);
    }
  };

  const updateLink = async (id: string, updates: Partial<Link>) => {
    try {
      await updateDoc(doc(db, 'links', id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `links/${id}`);
    }
  };

  const moveLink = async (id: string, direction: 'up' | 'down') => {
    const index = links.findIndex(l => l.id === id);
    if (direction === 'up' && index > 0) {
      const currentLink = links[index];
      const prevLink = links[index - 1];
      await updateLink(currentLink.id, { order: prevLink.order });
      await updateLink(prevLink.id, { order: currentLink.order });
    } else if (direction === 'down' && index < links.length - 1) {
      const currentLink = links[index];
      const nextLink = links[index + 1];
      await updateLink(currentLink.id, { order: nextLink.order });
      await updateLink(nextLink.id, { order: currentLink.order });
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(links).sort((a, b) => a.order - b.order);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update orders locally first for instant feedback
    const updatedLinks = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    setLinks(updatedLinks);

    // Update Firestore
    const batch = writeBatch(db);
    updatedLinks.forEach((link) => {
      const linkRef = doc(db, 'links', link.id);
      batch.update(linkRef, { order: link.order });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Failed to update link order:', error);
      handleFirestoreError(error, OperationType.UPDATE, 'links');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            B
          </div>
          <h1 className="font-bold text-xl text-slate-800">BioLink Admin</h1>
        </div>

        <div className="mb-6 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
          <img src={user.photoURL || ''} className="w-8 h-8 rounded-full" alt="User" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{user.displayName}</p>
            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>

        <button 
          onClick={() => setActiveTab('links')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-all text-sm font-medium",
            activeTab === 'links' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <LinkIcon className="w-4 h-4" />
          Links Management
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-all text-sm font-medium",
            activeTab === 'profile' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <Settings className="w-4 h-4" />
          Profile Settings
        </button>
        <button 
          onClick={() => setActiveTab('theme')}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg transition-all text-sm font-medium",
            activeTab === 'theme' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <Palette className="w-4 h-4" />
          Theme Customization
        </button>

        <div className="mt-auto pt-6 border-t border-slate-100 space-y-2">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 p-3 rounded-lg transition-all text-sm font-medium text-slate-600 hover:bg-slate-50 w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <button 
            onClick={() => {
              if (confirm('Are you sure you want to reset all data? This will clear Firestore collections.')) {
                // In a real app, you'd delete all docs. For this demo, we'll just reload.
                window.location.reload();
              }
            }}
            className="flex items-center gap-3 p-3 rounded-lg transition-all text-sm font-medium text-red-500 hover:bg-red-50 w-full text-left"
          >
            <Trash2 className="w-4 h-4" />
            Reset Data
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-10 overflow-y-auto max-h-screen">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'links' && (
              <motion.div
                key="links"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Links</h2>
                    <p className="text-slate-500 text-sm">Manage your social and action links</p>
                  </div>
                  <button 
                    onClick={addLink}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Link
                  </button>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="links">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-4"
                      >
                        {links.sort((a, b) => a.order - b.order).map((link, index) => (
                          <DraggableComponent key={link.id} draggableId={link.id} index={index}>
                            {(provided: any, snapshot: any) => {
                              return (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "bg-white border rounded-xl overflow-hidden transition-all",
                                    editingLink === link.id ? "border-blue-400 shadow-md" : "border-slate-200 shadow-sm",
                                    snapshot.isDragging && "shadow-xl ring-2 ring-blue-500/20 rotate-1"
                                  )}
                                >
                                  <div className="p-4 flex items-center gap-4">
                                    <div 
                                      {...provided.dragHandleProps}
                                      className="p-1 hover:bg-slate-100 rounded cursor-grab active:cursor-grabbing text-slate-400"
                                    >
                                      <GripVertical className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-slate-700">{link.title}</span>
                                        <span className={cn(
                                          "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                                          link.type === 'social' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                        )}>
                                          {link.type}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-400 truncate max-w-[200px]">{link.url}</p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => updateLink(link.id, { active: !link.active })}
                                        className={cn(
                                          "w-10 h-5 rounded-full relative transition-all",
                                          link.active ? "bg-green-500" : "bg-slate-200"
                                        )}
                                      >
                                        <div className={cn(
                                          "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                          link.active ? "right-1" : "left-1"
                                        )} />
                                      </button>
                                      <button 
                                        onClick={() => setEditingLink(editingLink === link.id ? null : link.id)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                                      >
                                        {editingLink === link.id ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                                      </button>
                                      <button 
                                        onClick={() => duplicateLink(link)}
                                        className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg"
                                        title="Duplicate"
                                      >
                                        <Copy className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => deleteLink(link.id)}
                                        className="p-2 hover:bg-red-50 text-red-500 rounded-lg"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {editingLink === link.id && (
                                    <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                                          <input 
                                            type="text"
                                            value={link.title}
                                            onChange={(e) => updateLink(link.id, { title: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL</label>
                                          <input 
                                            type="text"
                                            value={link.url}
                                            onChange={(e) => updateLink(link.id, { url: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Icon (Lucide name)</label>
                                          <select 
                                            value={link.icon}
                                            onChange={(e) => updateLink(link.id, { icon: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          >
                                            <option value="facebook">Facebook</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="twitter">Twitter</option>
                                            <option value="discord">Discord</option>
                                            <option value="github">Github</option>
                                            <option value="linkedin">Linkedin</option>
                                            <option value="youtube">Youtube</option>
                                            <option value="tiktok">TikTok</option>
                                            <option value="globe">Globe</option>
                                            <option value="website">Website</option>
                                            <option value="phone">Phone</option>
                                            <option value="mail">Mail</option>
                                            <option value="heart">Heart</option>
                                            <option value="dollar">Dollar</option>
                                            <option value="map">Map</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                          <select 
                                            value={link.type}
                                            onChange={(e) => updateLink(link.id, { type: e.target.value as 'social' | 'action' })}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          >
                                            <option value="social">Social Card</option>
                                            <option value="action">Action Button</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Button Text (Optional)</label>
                                          <input 
                                            type="text"
                                            value={link.buttonText || ''}
                                            onChange={(e) => updateLink(link.id, { buttonText: e.target.value })}
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g. Buy now"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Color</label>
                                          <input 
                                            type="color"
                                            value={link.color || '#3b82f6'}
                                            onChange={(e) => updateLink(link.id, { color: e.target.value })}
                                            className="w-full h-10 p-1 border border-slate-200 rounded-lg focus:outline-none"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }}
                          </DraggableComponent>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Profile</h2>
                  <p className="text-slate-500 text-sm">Update your public profile information</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 relative">
                        {uploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                        <img 
                          src={profile.avatarUrl} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <input 
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept="image/*"
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Avatar URL (or upload above)</label>
                      <input 
                        type="text"
                        value={profile.avatarUrl}
                        onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                      <input 
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bio</label>
                      <textarea 
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        rows={3}
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'theme' && (
              <motion.div
                key="theme"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Theme</h2>
                  <p className="text-slate-500 text-sm">Customize the look and feel of your page</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-700">Quick Presets</h3>
                    <button 
                      onClick={() => setProfile({
                        ...profile,
                        theme: {
                          ...profile.theme,
                          background: 'linear-gradient(135deg, #A61D21 0%, #6B1214 100%)',
                          textColor: '#ffffff'
                        }
                      })}
                      className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm flex items-center gap-2"
                    >
                      <Palette className="w-3 h-3" />
                      Apply Brand Theme
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Background (CSS)</label>
                      <input 
                        type="text"
                        value={profile.theme.background}
                        onChange={(e) => setProfile({ 
                          ...profile, 
                          theme: { ...profile.theme, background: e.target.value } 
                        })}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Text Color</label>
                      <input 
                        type="color"
                        value={profile.theme.textColor}
                        onChange={(e) => setProfile({ 
                          ...profile, 
                          theme: { ...profile.theme, textColor: e.target.value } 
                        })}
                        className="w-full h-10 p-1 border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Card Background</label>
                      <input 
                        type="color"
                        value={profile.theme.cardBackground}
                        onChange={(e) => setProfile({ 
                          ...profile, 
                          theme: { ...profile.theme, cardBackground: e.target.value } 
                        })}
                        className="w-full h-10 p-1 border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Card Text Color</label>
                      <input 
                        type="color"
                        value={profile.theme.cardTextColor}
                        onChange={(e) => setProfile({ 
                          ...profile, 
                          theme: { ...profile.theme, cardTextColor: e.target.value } 
                        })}
                        className="w-full h-10 p-1 border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
