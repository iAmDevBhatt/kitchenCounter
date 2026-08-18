import { useState, useEffect } from 'react'

// Mock label parser - in reality this would fetch from backend
const useLabels = () => {
  const [labels, setLabels] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Parse labels from properties file 
  useEffect(() => {
    // This would be replaced with actual API call in real implementation
    const mockLabels = {
      'nav.diet-stats': 'Diet & Stats',
      'nav.inventory': 'Inventory',
      'nav.kitchen-slab': 'Kitchen Slab',
      'nav.configuration': 'Configuration',
      'nav.theme': 'Theme',
      'nav.logout': 'Logout',
      'page.inventory.title': 'My Kitchen Inventory',
      'page.kitchen-slab.title': 'Kitchen Slab',
      'page.configuration.title': 'Configuration',
      'page.theme.title': 'Theme Settings',
      'btn.add.item': 'Add Item',
      'btn.edit': 'Edit',
      'btn.delete': 'Delete',
      'btn.save': 'Save',
      'btn.cancel': 'Cancel',
      'btn.create.month': 'Create Month',
      'btn.upload.wallpaper': 'Upload Wallpaper',
      'btn.set.as.active': 'Set as Active',
      'btn.generate.shopping.list': 'Generate Shopping List',
      'btn.view.expiring.soon': 'View Expiring Soon',
      'tab.current.stock': 'Currently In Stock',
      'tab.running.low': 'Running Low',
      'tab.out.of.stock': 'Out of Stock',
      'status.in.use': 'In Use',
      'status.stocked': 'Stocked',
      'status.finished': 'Finished',
      'status.not.in.stock': 'Not in Stock',
      'status.planned': 'Planned',
      'status.done': 'Done',
      'status.skipped': 'Skipped',
      'field.item.name': 'Item Name',
      'field.category': 'Category',
      'field.quantity': 'Quantity',
      'field.status': 'Status',
      'field.usage.percentage': 'Usage Percentage',
      'field.expiration.date': 'Expiration Date',
      'field.notes': 'Notes',
      'field.description': 'Description',
      'field.image': 'Image',
      'mealprep.breakfast': 'Breakfast',
      'mealprep.lunch': 'Lunch',
      'mealprep.dinner': 'Dinner',
      'mealprep.video.url': 'Video URL',
      'mealprep.notes': 'Notes',
      'theme.wallpaper.upload': 'Wallpaper Upload',
      'theme.preview': 'Theme Preview',
      'theme.customization': 'Theme Customization',
      'theme.saved.themes': 'Saved Themes',
      'error.invalid.file.type': 'Invalid file type',
      'error.upload.failed': 'Upload failed',
      'error.required.fields': 'Please fill all required fields',
      'success.item.added': 'Item added successfully',
      'success.item.updated': 'Item updated successfully',
      'success.item.deleted': 'Item deleted successfully'
    }
    
    setLabels(mockLabels)
    setLoading(false)
  }, [])

  const getLabel = (key, params = {}) => {
    if (loading) return key
    let label = labels[key] || key
    
    // Replace parameters in the label
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      label = label.replace(`{${paramKey}}`, paramValue)
    })
    
    return label
  }

  const getAllLabels = () => {
    return labels
  }

  return {
    getLabel,
    getAllLabels,
    loading,
    error
  }
}

export default useLabels