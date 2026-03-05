"use client";
import { useState, useEffect } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  CheckCircle,
  AlertCircle,
  Search,
  X,
  Upload,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ArrowUpDown,
  Filter,
  FolderOpen,
} from "lucide-react";
import { useToast } from "../../components/Toast.jsx";

const EMPTY_PRODUCT = {
  title: "",
  handle: "",
  description: "",
  description_html: "",
  is_bestseller: false,
  is_featured: false,
  images: [],
  options: [],
  variants: [],
  pricing: null,
  collection_ids: [],
};

const EMPTY_PRICING = {
  pricing_mode: "live",
  weight_10k: "",
  weight_14k: "",
  weight_18k: "",
  diamond_shapes: "",
  total_diamonds: "",
  diamond_weight: "",
  total_diamond_weight: "",
  diamond_price: "",
  gold_price_14k: "",
  making_charges: "",
  gst: "",
  price_10k: "",
  price_14k: "",
  price_18k: "",
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Generate all combinations from arrays of values
function cartesian(...arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])),
    [[]]
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [collections, setCollections] = useState([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_PRODUCT });
  const [uploading, setUploading] = useState(false);

  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    basic: true,
    collections: true,
    html: false,
    images: true,
    options: true,
    variants: true,
    pricing: false,
  });
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ========== API calls ==========

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        if (data.collections) setCollections(data.collections);
      }
    } catch (err) {
      showMessage("error", "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  
  const handleCreate = () => {
    setEditingId(null);
    setFormData({
      ...EMPTY_PRODUCT,
      images: [],
      options: [],
      variants: [],
      pricing: null,
      collection_ids: [],
    });
    setNewCollectionTitle("");
    setOpenSections({
      basic: true,
      collections: true,
      html: false,
      images: true,
      options: true,
      variants: true,
      pricing: false,
    });
    setShowForm(true);
  };

  const handleEdit = async (product) => {
    toast.info("Loading product...");

    try {
      const detailRes = await fetch(
        `/api/products?detail=${product.id}`
      );
      const detailData = await detailRes.json();

      if (detailData.error) {
        showMessage("error", detailData.error);
        return;
      }

      const p = detailData.product;

      setEditingId(product.id);
      setFormData({
        title: p.title || "",
        handle: p.handle || "",
        description: p.description || "",
        description_html: p.description_html || "",
        is_bestseller: p.is_bestseller ?? false,
        is_featured: p.is_featured ?? false,
        images: (p.images || []).map((img) => ({
          url: img.url,
          alt_text: img.alt_text || "",
        })),
        options: (p.options || []).map((opt) => ({
          name: opt.name,
          values: opt.values || [],
        })),
        variants: (p.variants || []).map((v) => ({
          title: v.title,
          sku: v.sku || "",
          price_amount: v.price_amount || 0,
          available_for_sale: v.available_for_sale ?? true,
          selected_options: (v.selected_options || []).map((so) => ({
            option_name: so.option_name,
            option_value: so.option_value,
          })),
        })),
        pricing: p.pricing
          ? {
              pricing_mode: p.pricing.pricing_mode || "live",
              weight_10k: p.pricing.weight_10k || "",
              weight_14k: p.pricing.weight_14k || "",
              weight_18k: p.pricing.weight_18k || "",
              diamond_shapes: p.pricing.diamond_shapes || "",
              total_diamonds: p.pricing.total_diamonds || "",
              diamond_weight: p.pricing.diamond_weight || "",
              total_diamond_weight: p.pricing.total_diamond_weight || "",
              diamond_price: p.pricing.diamond_price || "",
              gold_price_14k: p.pricing.gold_price_14k || "",
              making_charges: p.pricing.making_charges || "",
              gst: p.pricing.gst || "",
              price_10k: p.pricing.price_10k || "",
              price_14k: p.pricing.price_14k || "",
              price_18k: p.pricing.price_18k || "",
            }
          : null,
        collection_ids: p.collection_ids || [],
      });
      setNewCollectionTitle("");
      setOpenSections({
        basic: true,
        collections: true,
        html: false,
        images: true,
        options: true,
        variants: true,
        pricing: !!p.pricing,
      });
      setShowForm(true);
    } catch (err) {
      showMessage("error", "Failed to load product details");
    }
  };

  const handleSave = async () => {
    
    if (!formData.title) {
      showMessage("error", "Product title is required");
      return;
    }

    setSaving(true);
    try {
      const productData = {
        title: formData.title,
        handle: formData.handle || slugify(formData.title),
        description: formData.description || null,
        description_html: formData.description_html || null,
        is_bestseller: !!formData.is_bestseller,
        is_featured: !!formData.is_featured,
        featured_image_url: formData.images[0]?.url || null,
        featured_image_alt:
          formData.images[0]?.alt_text || formData.title,
        images: formData.images,
        options: formData.options.map((opt) => ({
          name: opt.name,
          values: Array.isArray(opt.values)
            ? opt.values
            : opt.values
                .split(",")
                .map((v) => v.trim())
                .filter((v) => v),
        })),
        variants: formData.variants.map((v) => ({
          title: v.title,
          sku: v.sku || null,
          price_amount: parseFloat(v.price_amount) || 0,
          available_for_sale: v.available_for_sale ?? true,
          selected_options: v.selected_options || [],
        })),
        pricing: formData.pricing || undefined,
        collection_ids: formData.collection_ids || [],
      };

      let res;
      if (editingId) {
        res = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId,
            product: productData,
          }),
        });
      } else {
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: productData }),
        });
      }

      const data = await res.json();

      if (data.error) {
        showMessage("error", data.error);
      } else {
        toast.success(editingId ? "Product updated" : "Product created");
        setShowForm(false);
        setEditingId(null);
        setFormData({ ...EMPTY_PRODUCT });
        fetchProducts();
      }
    } catch (err) {
      showMessage("error", "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCollection = async () => {
    const title = newCollectionTitle.trim();
    if (!title) return;

    setCreatingCollection(true);
    try {
      const res = await fetch("/api/products/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        const newCol = data.collection;
        setCollections((prev) => [...prev, newCol].sort((a, b) => a.title.localeCompare(b.title)));
        setFormData((prev) => ({
          ...prev,
          collection_ids: [...(prev.collection_ids || []), newCol.id],
        }));
        setNewCollectionTitle("");
        toast.success(`Collection "${newCol.title}" created`);
      }
    } catch {
      toast.error("Failed to create collection");
    } finally {
      setCreatingCollection(false);
    }
  };

  const handleDelete = async (id, title) => {
    
    if (
      !window.confirm(
        `Are you sure you want to delete "${title}"? This cannot be undone.`
      )
    )
      return;

    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (data.error) {
        showMessage("error", data.error);
      } else {
        toast.success("Product deleted");
        fetchProducts();
      }
    } catch (err) {
      showMessage("error", "Failed to delete product");
    }
  };

  // ========== Image upload ==========

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    

    const handle = formData.handle || slugify(formData.title || "product");

    setUploading(true);
    const newImages = [...formData.images];

    for (const file of files) {
      try {
        const fd = new FormData();
                fd.append("handle", handle);
        fd.append("file", file);

        const res = await fetch("/api/products/upload", {
          method: "POST",
          body: fd,
        });

        const data = await res.json();
        if (data.success) {
          newImages.push({ url: data.url, alt_text: "" });
        } else {
          toast.error(data.error || "Upload failed");
        }
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setFormData({ ...formData, images: newImages });
    setUploading(false);
    // Reset file input
    e.target.value = "";
  };

  const removeImage = (index) => {
    const updated = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: updated });
  };

  // ========== Options ==========

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, { name: "", values: [] }],
    });
  };

  const removeOption = (index) => {
    const updated = formData.options.filter((_, i) => i !== index);
    setFormData({ ...formData, options: updated });
  };

  const updateOption = (index, field, value) => {
    const updated = [...formData.options];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, options: updated });
  };

  // ========== Variants ==========

  const generateVariants = () => {
    const opts = formData.options.filter(
      (o) => o.name && (Array.isArray(o.values) ? o.values.length > 0 : o.values)
    );

    if (opts.length === 0) {
      showMessage("error", "Add at least one option with values first");
      return;
    }

    const parsedOpts = opts.map((o) => ({
      name: o.name,
      values: Array.isArray(o.values)
        ? o.values
        : o.values
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v),
    }));

    const combos = cartesian(...parsedOpts.map((o) => o.values));

    const variants = combos.map((combo) => ({
      title: combo.join(" / "),
      sku: "",
      price_amount: 0,
      available_for_sale: true,
      selected_options: combo.map((val, i) => ({
        option_name: parsedOpts[i].name,
        option_value: val,
      })),
    }));

    setFormData({ ...formData, variants });
    toast.success(`Generated ${variants.length} variants`);
  };

  const updateVariant = (index, field, value) => {
    const updated = [...formData.variants];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, variants: updated });
  };

  const removeVariant = (index) => {
    const updated = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: updated });
  };

  // ========== Filtering + Sorting ==========

  const filteredProducts = products
    .filter((p) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.handle.toLowerCase().includes(q)
        )
          return false;
      }
      // Status filter
      if (filterBy === "priced" && !p.has_pricing) return false;
      if (filterBy === "unpriced" && p.has_pricing) return false;
      if (filterBy === "no-image" && p.featured_image_url) return false;
      if (filterBy === "no-variants" && p.variant_count > 0) return false;
      if (filterBy === "bestseller" && !p.is_bestseller) return false;
      if (filterBy === "featured" && !p.is_featured) return false;
      if (filterBy === "both" && !(p.is_bestseller && p.is_featured))
        return false;
      // Collection filter
      if (collectionFilter !== "all") {
        if (!(p.collections || []).includes(collectionFilter)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "title-desc":
          return b.title.localeCompare(a.title);
        case "variants-desc":
          return b.variant_count - a.variant_count;
        case "variants-asc":
          return a.variant_count - b.variant_count;
        default:
          return 0;
      }
    });

  // ========== Section header component ==========

  const SectionHeader = ({ sectionKey, title, count }) => (
    <button
      type="button"
      onClick={() => toggleSection(sectionKey)}
      className="w-full flex justify-between items-center py-3 text-left font-semibold text-[#0a1833] text-sm tracking-wide"
    >
      <span>
        {title}
        {count !== undefined && (
          <span className="ml-2 text-xs font-normal text-gray-500">
            ({count})
          </span>
        )}
      </span>
      {openSections[sectionKey] ? (
        <ChevronUp size={18} className="text-gray-400" />
      ) : (
        <ChevronDown size={18} className="text-gray-400" />
      )}
    </button>
  );

  // ========== Render ==========

  return (
    <div className="min-h-screen bg-gray-50 py-35 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Package className="w-8 h-8 text-[#0a1833]" />
          <div>
            <h1 className="text-3xl font-bold text-[#0a1833]">
              Product Management
            </h1>
            <p className="text-gray-600 text-sm">
              Add, edit, and delete products
            </p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg mb-6 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {message.text}
          </div>
        )}

        {/* Search + Filters + Sort + Add Button */}
        {!showForm && (
          <div className="space-y-3 mb-6">
            {/* Row 1: Search + Add */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or handle..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-[#0a1833] text-white rounded-lg text-sm font-medium hover:bg-[#1a2f5a] transition whitespace-nowrap"
              >
                <Plus size={16} />
                Add Product
              </button>
            </div>

            {/* Row 2: Sort + Collection + Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Sort */}
              <div className="flex items-center gap-2">
                <ArrowUpDown size={14} className="text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title-asc">Title A-Z</option>
                  <option value="title-desc">Title Z-A</option>
                  <option value="variants-desc">Most variants</option>
                  <option value="variants-asc">Fewest variants</option>
                </select>
              </div>

              {/* Collection filter */}
              {collections.length > 0 && (
                <select
                  value={collectionFilter}
                  onChange={(e) => setCollectionFilter(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#0a1833] focus:border-transparent"
                >
                  <option value="all">All Collections</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Status filter chips */}
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-500" />
                {[
                  { value: "all", label: "All" },
                  { value: "priced", label: "Priced" },
                  { value: "unpriced", label: "Unpriced" },
                  { value: "no-image", label: "No image" },
                  { value: "no-variants", label: "No variants" },
                  { value: "bestseller", label: "Best Seller" },
                  { value: "featured", label: "Featured" },
                  { value: "both", label: "Both" },
                ].map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilterBy(f.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      filterBy === f.value
                        ? "bg-[#0a1833] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================== FORM =================== */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-bold text-[#0a1833] mb-4">
              {editingId ? "Edit Product" : "New Product"}
            </h2>

            {/* --- Basic Info --- */}
            <div className="border-b border-gray-200">
              <SectionHeader sectionKey="basic" title="BASIC INFO" />
              {openSections.basic && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setFormData({
                          ...formData,
                          title,
                          handle: editingId
                            ? formData.handle
                            : slugify(title),
                        });
                      }}
                      placeholder="e.g. Luna Diamond Pendant"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Handle (URL slug)
                    </label>
                    <input
                      type="text"
                      value={formData.handle}
                      onChange={(e) =>
                        setFormData({ ...formData, handle: e.target.value })
                      }
                      placeholder="luna-diamond-pendant"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (plain text)
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                      placeholder="Brief product description..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Flags
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!formData.is_bestseller}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              is_bestseller: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        Best Seller
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={!!formData.is_featured}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              is_featured: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        Featured
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* --- Collections --- */}
            <div className="border-b border-gray-200">
              <SectionHeader
                sectionKey="collections"
                title="COLLECTIONS"
                count={formData.collection_ids?.length || 0}
              />
              {openSections.collections && (
                <div className="pb-4 space-y-3">
                  {collections.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {collections.map((c) => (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                            (formData.collection_ids || []).includes(c.id)
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={(formData.collection_ids || []).includes(
                              c.id
                            )}
                            onChange={(e) => {
                              const ids = formData.collection_ids || [];
                              setFormData({
                                ...formData,
                                collection_ids: e.target.checked
                                  ? [...ids, c.id]
                                  : ids.filter((id) => id !== c.id),
                              });
                            }}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          <FolderOpen size={14} className="text-gray-400" />
                          {c.title}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No collections yet. Create one below.
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newCollectionTitle}
                      onChange={(e) => setNewCollectionTitle(e.target.value)}
                      placeholder="New collection name..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCollection();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={
                        creatingCollection || !newCollectionTitle.trim()
                      }
                      onClick={handleCreateCollection}
                      className="px-4 py-2 bg-[#0a1833] text-white rounded-lg text-sm hover:bg-[#1a2843] disabled:opacity-50 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      {creatingCollection ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* --- Description HTML --- */}
            <div className="border-b border-gray-200">
              <SectionHeader sectionKey="html" title="DESCRIPTION HTML" />
              {openSections.html && (
                <div className="pb-4">
                  <p className="text-xs text-gray-500 mb-2">
                    Paste the HTML for product specs (diamond details, gold
                    weights, dimensions). This powers the Diamond Details and
                    Product Details tabs.
                  </p>
                  <textarea
                    value={formData.description_html}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_html: e.target.value,
                      })
                    }
                    rows={8}
                    placeholder='<div class="product-description"><ul><li><strong>Diamond Shape:</strong> Round</li>...</ul></div>'
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              )}
            </div>

            {/* --- Images --- */}
            <div className="border-b border-gray-200">
              <SectionHeader
                sectionKey="images"
                title="IMAGES"
                count={formData.images.length}
              />
              {openSections.images && (
                <div className="pb-4">
                  <div className="flex flex-wrap gap-4 mb-4">
                    {formData.images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img.url}
                          alt={img.alt_text || "Product image"}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        />
                        {i === 0 && (
                          <span className="absolute top-0 left-0 bg-[#0a1833] text-white text-[10px] px-1.5 py-0.5 rounded-tl-lg rounded-br-lg">
                            Featured
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Upload button */}
                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#0a1833] transition text-gray-400 hover:text-[#0a1833]">
                      {uploading ? (
                        <span className="text-xs">Uploading...</span>
                      ) : (
                        <>
                          <Upload size={20} />
                          <span className="text-xs mt-1">Upload</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>

                  {/* Add image by URL */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Or paste image URL..."
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target.value) {
                          setFormData({
                            ...formData,
                            images: [
                              ...formData.images,
                              { url: e.target.value, alt_text: "" },
                            ],
                          });
                          e.target.value = "";
                        }
                      }}
                    />
                    <span className="text-xs text-gray-400 self-center">
                      Press Enter to add
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* --- Options --- */}
            <div className="border-b border-gray-200">
              <SectionHeader
                sectionKey="options"
                title="OPTIONS"
                count={formData.options.length}
              />
              {openSections.options && (
                <div className="pb-4 space-y-3">
                  {formData.options.map((opt, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={opt.name}
                          onChange={(e) =>
                            updateOption(i, "name", e.target.value)
                          }
                          placeholder="Option name (e.g. Gold Karat)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-1"
                        />
                        <input
                          type="text"
                          value={
                            Array.isArray(opt.values)
                              ? opt.values.join(", ")
                              : opt.values
                          }
                          onChange={(e) =>
                            updateOption(i, "values", e.target.value)
                          }
                          placeholder="Values (comma-separated: 10K, 14K, 18K)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={addOption}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#0a1833] border border-[#0a1833] rounded-lg hover:bg-gray-50 transition"
                    >
                      <Plus size={14} />
                      Add Option
                    </button>
                    {formData.options.length > 0 && (
                      <button
                        type="button"
                        onClick={generateVariants}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Generate Variants
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* --- Variants --- */}
            <div className="border-b border-gray-200">
              <SectionHeader
                sectionKey="variants"
                title="VARIANTS"
                count={formData.variants.length}
              />
              {openSections.variants && (
                <div className="pb-4">
                  {formData.variants.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No variants yet. Add options above and click &quot;Generate
                      Variants&quot;.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-2 px-3 text-left font-medium text-gray-600">
                              Variant
                            </th>
                            <th className="py-2 px-3 text-left font-medium text-gray-600">
                              SKU
                            </th>
                            <th className="py-2 px-3 text-left font-medium text-gray-600">
                              Price (INR)
                            </th>
                            <th className="py-2 px-3 text-center font-medium text-gray-600">
                              Available
                            </th>
                            <th className="py-2 px-3 w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {formData.variants.map((v, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="py-2 px-3 font-medium text-gray-800">
                                {v.title}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={v.sku}
                                  onChange={(e) =>
                                    updateVariant(i, "sku", e.target.value)
                                  }
                                  placeholder="SKU"
                                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={v.price_amount}
                                  onChange={(e) =>
                                    updateVariant(
                                      i,
                                      "price_amount",
                                      e.target.value
                                    )
                                  }
                                  className="w-28 px-2 py-1 border border-gray-200 rounded text-sm"
                                />
                              </td>
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={v.available_for_sale}
                                  onChange={(e) =>
                                    updateVariant(
                                      i,
                                      "available_for_sale",
                                      e.target.checked
                                    )
                                  }
                                  className="w-4 h-4"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <button
                                  type="button"
                                  onClick={() => removeVariant(i)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* --- Pricing Data --- */}
            <div className="border-b border-gray-200">
              <SectionHeader
                sectionKey="pricing"
                title="PRICING DATA"
              />
              {openSections.pricing && (
                <div className="pb-4">
                  {!formData.pricing ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-500">
                        No pricing data. Add weights and diamond info for
                        dynamic price calculation.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            pricing: { ...EMPTY_PRICING },
                          })
                        }
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-[#0a1833] border border-[#0a1833] rounded-lg hover:bg-gray-50 transition whitespace-nowrap"
                      >
                        <Plus size={14} />
                        Add Pricing
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Pricing Mode Toggle */}
                      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Pricing Mode:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                pricing: { ...formData.pricing, pricing_mode: "live" },
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              (formData.pricing?.pricing_mode || "live") === "live"
                                ? "bg-green-600 text-white"
                                : "bg-white border border-gray-300 text-gray-600 hover:border-gray-400"
                            }`}
                          >
                            Live Gold Rate
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                pricing: { ...formData.pricing, pricing_mode: "fixed" },
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              formData.pricing?.pricing_mode === "fixed"
                                ? "bg-blue-600 text-white"
                                : "bg-white border border-gray-300 text-gray-600 hover:border-gray-400"
                            }`}
                          >
                            Fixed Price
                          </button>
                        </div>
                        <span className="text-xs text-gray-500">
                          {(formData.pricing?.pricing_mode || "live") === "live"
                            ? "Price calculated from live gold rate + weights"
                            : "Uses 10K/14K/18K prices directly"}
                        </span>
                      </div>

                      {/* Gold Weights */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Gold Weights (grams)
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { key: "weight_10k", label: "10K Weight" },
                            { key: "weight_14k", label: "14K Weight" },
                            { key: "weight_18k", label: "18K Weight" },
                          ].map((f) => (
                            <div key={f.key}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {f.label}
                              </label>
                              <input
                                type="number"
                                step="0.001"
                                value={formData.pricing[f.key]}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pricing: {
                                      ...formData.pricing,
                                      [f.key]: e.target.value,
                                    },
                                  })
                                }
                                placeholder="0.000"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Diamond Info */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Diamond Info
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            {
                              key: "diamond_shapes",
                              label: "Diamond Shapes",
                              placeholder: "Round, Pear",
                            },
                            {
                              key: "total_diamonds",
                              label: "Total Diamonds",
                              placeholder: "10, 2",
                            },
                            {
                              key: "diamond_weight",
                              label: "Diamond Weight (each)",
                              placeholder: "0.01, 0.25",
                            },
                            {
                              key: "total_diamond_weight",
                              label: "Total Diamond Weight",
                              placeholder: "0.60ct",
                            },
                          ].map((f) => (
                            <div key={f.key}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {f.label}
                              </label>
                              <input
                                type="text"
                                value={formData.pricing[f.key]}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pricing: {
                                      ...formData.pricing,
                                      [f.key]: e.target.value,
                                    },
                                  })
                                }
                                placeholder={f.placeholder}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Price Breakdown (INR)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            {
                              key: "diamond_price",
                              label: "Diamond Price",
                            },
                            {
                              key: "gold_price_14k",
                              label: "Gold Price (14K)",
                            },
                            {
                              key: "making_charges",
                              label: "Making Charges",
                            },
                            { key: "gst", label: "GST" },
                          ].map((f) => (
                            <div key={f.key}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {f.label}
                              </label>
                              <input
                                type="number"
                                value={formData.pricing[f.key]}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pricing: {
                                      ...formData.pricing,
                                      [f.key]: e.target.value,
                                    },
                                  })
                                }
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total Prices per Karat */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Total Prices per Karat (INR)
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { key: "price_10k", label: "10K Price" },
                            { key: "price_14k", label: "14K Price" },
                            { key: "price_18k", label: "18K Price" },
                          ].map((f) => (
                            <div key={f.key}>
                              <label className="block text-xs text-gray-600 mb-1">
                                {f.label}
                              </label>
                              <input
                                type="number"
                                value={formData.pricing[f.key]}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    pricing: {
                                      ...formData.pricing,
                                      [f.key]: e.target.value,
                                    },
                                  })
                                }
                                placeholder="0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Remove pricing button */}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, pricing: null })
                        }
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove pricing data
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* --- Save / Cancel --- */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-[#0a1833] text-white rounded-lg text-sm font-medium hover:bg-[#1a2f5a] disabled:opacity-50 transition"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Product"
                  : "Create Product"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* =================== PRODUCT LIST =================== */}
        {!showForm &&
          (loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                {searchQuery
                  ? "No products match your search"
                  : "No products yet"}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-600 font-medium">
                <span>
                  {filteredProducts.length} product
                  {filteredProducts.length !== 1 ? "s" : ""}
                  {searchQuery && ` matching "${searchQuery}"`}
                  {filterBy !== "all" && ` (${filterBy})`}
                  {collectionFilter !== "all" &&
                    ` in ${collectionFilter}`}
                </span>
                {(searchQuery ||
                  filterBy !== "all" ||
                  collectionFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterBy("all");
                      setCollectionFilter("all");
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition"
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {product.featured_image_url ? (
                        <img
                          src={product.featured_image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon
                            size={20}
                            className="text-gray-300"
                          />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {product.title}
                      </h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                        <span>/{product.handle}</span>
                        <span>
                          {product.variant_count} variant
                          {product.variant_count !== 1 ? "s" : ""}
                        </span>
                        {product.has_pricing && (
                          <span className="text-green-600">Priced</span>
                        )}
                        {product.is_bestseller && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium">
                            Best Seller
                          </span>
                        )}
                        {product.is_featured && (
                          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium">
                            Featured
                          </span>
                        )}
                        {(product.collections || []).map((col) => (
                          <span
                            key={col}
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(product.id, product.title)
                        }
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

