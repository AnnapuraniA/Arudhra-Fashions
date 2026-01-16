import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, X } from 'lucide-react'
import { useToast } from '../../components/Toast/ToastContainer'
import { adminCategoriesAPI } from '../../utils/adminApi'

function Categories() {
  const { success, error: showError } = useToast()
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [editingSubcategory, setEditingSubcategory] = useState(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false)
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false)
  const [showEditSubcategoryModal, setShowEditSubcategoryModal] = useState(false)
  const [subcategoryForm, setSubcategoryForm] = useState({ categoryId: '', name: '' })
  const [editCategoryForm, setEditCategoryForm] = useState({ id: '', name: '' })
  const [editSubcategoryForm, setEditSubcategoryForm] = useState({ id: '', name: '' })
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const data = await adminCategoriesAPI.getAll()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading categories:', err)
      showError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryName.trim()) {
      showError('Please enter a category name')
      return
    }
    try {
      await adminCategoriesAPI.create({
        name: newCategoryName.trim(),
        description: '',
        isActive: true
      })
      setNewCategoryName('')
      setShowAddCategoryModal(false)
      await loadCategories()
      success('Category added successfully')
    } catch (err) {
      showError(err.message || 'Failed to add category')
    }
  }

  const handleAddSubcategory = (categoryId) => {
    setSubcategoryForm({ categoryId, name: '' })
    setShowSubcategoryModal(true)
  }

  const handleSubmitSubcategory = async () => {
    if (!subcategoryForm.name.trim()) {
      showError('Please enter subcategory name')
      return
    }
    try {
      await adminCategoriesAPI.addSubcategory(subcategoryForm.categoryId, {
        name: subcategoryForm.name.trim(),
        isActive: true
      })
      await loadCategories()
      setShowSubcategoryModal(false)
      setSubcategoryForm({ categoryId: '', name: '' })
      success('Subcategory added successfully')
      } catch (err) {
        showError(err.message || 'Failed to add subcategory')
      }
  }

  const handleDeleteCategory = async (categoryId) => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return
    
    if (window.confirm(`Delete category "${category.name}" and all its subcategories?`)) {
      try {
        await adminCategoriesAPI.delete(categoryId)
        await loadCategories()
        success('Category deleted successfully')
      } catch (err) {
        showError(err.message || 'Failed to delete category')
      }
    }
  }

  const handleDeleteSubcategory = async (subcategoryId) => {
    if (window.confirm('Delete this subcategory?')) {
      try {
        await adminCategoriesAPI.deleteSubcategory(subcategoryId)
        await loadCategories()
        success('Subcategory deleted successfully')
      } catch (err) {
        showError(err.message || 'Failed to delete subcategory')
      }
    }
  }

  const handleEditSubcategory = async (subcategoryId, oldName, newName) => {
    if (!newName || !newName.trim()) {
      showError('Please enter a subcategory name')
      return
    }
    if (newName.trim() === oldName) {
      // No change, just close modal
      return
    }
    try {
      await adminCategoriesAPI.updateSubcategory(subcategoryId, {
        name: newName.trim()
      })
      await loadCategories()
      success('Subcategory updated successfully')
    } catch (err) {
      showError(err.message || 'Failed to update subcategory')
    }
  }

  const handleEditSubcategoryFromForm = async () => {
    if (!editSubcategoryForm.name || !editSubcategoryForm.name.trim()) {
      showError('Please enter a subcategory name')
      return
    }
    try {
      const subcategory = categories
        .flatMap(cat => cat.subcategories || [])
        .find(sub => sub.id === editSubcategoryForm.id)
      const oldName = subcategory?.name || ''
      await handleEditSubcategory(editSubcategoryForm.id, oldName, editSubcategoryForm.name.trim())
      setShowEditSubcategoryModal(false)
    } catch (err) {
      // Error already handled in handleEditSubcategory
    }
  }

  const handleEditCategory = async (categoryId, updates) => {
    try {
      await adminCategoriesAPI.update(categoryId, updates)
      await loadCategories()
      success('Category updated successfully')
    } catch (err) {
      showError(err.message || 'Failed to update category')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Categories & Subcategories</h1>
          <p>Manage product categories and subcategories</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddCategoryModal(true)}>
          <Plus size={18} />
          Add New Category
        </button>
      </div>

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowAddCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Category</h2>
              <button className="modal-close" onClick={() => setShowAddCategoryModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Men, Accessories, etc."
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCategory()
                    }
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowAddCategoryModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddCategory}>
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowEditCategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Category</h2>
              <button className="modal-close" onClick={() => setShowEditCategoryModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={editCategoryForm.name}
                  onChange={(e) => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })}
                  placeholder="Category name"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleEditCategory(editCategoryForm.id, { name: editCategoryForm.name.trim() })
                      setShowEditCategoryModal(false)
                    }
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEditCategoryModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (!editCategoryForm.name || !editCategoryForm.name.trim()) {
                    showError('Please enter a category name')
                    return
                  }
                  handleEditCategory(editCategoryForm.id, { name: editCategoryForm.name.trim() })
                  setShowEditCategoryModal(false)
                }}
              >
                Update Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subcategory Modal */}
      {showSubcategoryModal && (
        <div className="modal-overlay" onClick={() => setShowSubcategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Subcategory</h2>
              <button className="modal-close" onClick={() => setShowSubcategoryModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Subcategory Name *</label>
                <input
                  type="text"
                  value={subcategoryForm.name}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                  placeholder="e.g., Shirts, Pants, etc."
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitSubcategory()
                    }
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowSubcategoryModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmitSubcategory}>
                Add Subcategory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subcategory Modal */}
      {showEditSubcategoryModal && (
        <div className="modal-overlay" onClick={() => setShowEditSubcategoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Subcategory</h2>
              <button className="modal-close" onClick={() => setShowEditSubcategoryModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Subcategory Name *</label>
                <input
                  type="text"
                  value={editSubcategoryForm.name}
                  onChange={(e) => setEditSubcategoryForm({ ...editSubcategoryForm, name: e.target.value })}
                  placeholder="Subcategory name"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleEditSubcategoryFromForm()
                      setShowEditSubcategoryModal(false)
                    }
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowEditSubcategoryModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleEditSubcategoryFromForm}
              >
                Update Subcategory
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading categories...</div>
      ) : (
        <div className="categories-list">
          {categories.length === 0 ? (
            <div className="empty-state">
              <p>No categories found. Add your first category to get started.</p>
            </div>
          ) : (
            categories.map(category => (
              <div key={category.id} className="category-card">
                <div 
                  className="category-header"
                  onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                >
                  <div className="category-title-wrapper">
                    {expandedCategory === category.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <h2>{category.name}</h2>
                    <span className="subcategory-count">
                      {category.subcategories?.length || 0} subcategories
                    </span>
                  </div>
                  <div className="category-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => handleAddSubcategory(category.id)}
                    >
                      <Plus size={16} />
                      Add Subcategory
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => {
                        setEditCategoryForm({ id: category.id, name: category.name })
                        setShowEditCategoryModal(true)
                      }}
                      title="Edit Category"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={() => handleDeleteCategory(category.id)}
                      title="Delete Category"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expandedCategory === category.id && (
                  <div className="subcategories-list">
                    {category.subcategories && category.subcategories.length > 0 ? (
                      category.subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="subcategory-item">
                          <span>{subcategory.name}</span>
                          <div className="subcategory-actions">
                            <button
                              className="btn-icon"
                              onClick={() => {
                                setEditSubcategoryForm({ id: subcategory.id, name: subcategory.name })
                                setShowEditSubcategoryModal(true)
                              }}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="btn-icon danger"
                              onClick={() => handleDeleteSubcategory(subcategory.id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-subcategories">
                        <p>No subcategories. Click "Add Subcategory" to add one.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default Categories

