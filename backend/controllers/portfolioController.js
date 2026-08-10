import Portfolio from '../models/Portfolio.js';

// @desc    Add portfolio item
// @route   POST /api/portfolio
// @access  Private
export const addPortfolioItem = async (req, res) => {
    try {
        const { title, description, category, projectUrl, tags, skills, project } = req.body;

        // Map frontend projectUrl to model link field
        const link = projectUrl;

        // Map tags (comma-separated string) to skills array
        const skillsArray = Array.isArray(skills)
            ? skills
            : (tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : []);

        const portfolio = await Portfolio.create({
            title,
            description,
            category,
            link,
            skills: skillsArray,
            project,
            user: req.user._id
        });

        res.status(201).json(portfolio);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get user's portfolio
// @route   GET /api/portfolio/user/:userId
// @access  Public
export const getUserPortfolio = async (req, res) => {
    try {
        const { category, featured } = req.query;
        const query = { user: req.params.userId };

        if (category) query.category = category;
        if (featured) query.featured = featured === 'true';

        const portfolio = await Portfolio.find(query)
            .populate('project', 'title status')
            .sort({ featured: -1, createdAt: -1 });

        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get single portfolio item
// @route   GET /api/portfolio/:id
// @access  Public
export const getPortfolioItem = async (req, res) => {
    try {
        const item = await Portfolio.findById(req.params.id)
            .populate('user', 'username profile reputation')
            .populate('project', 'title status');

        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }

        // Increment views
        item.views += 1;
        await item.save();

        res.json(item);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Update portfolio item
// @route   PUT /api/portfolio/:id
// @access  Private (Owner only)
export const updatePortfolioItem = async (req, res) => {
    try {
        const item = await Portfolio.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }

        // Check ownership
        if (item.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { title, description, category, projectUrl, tags, skills, project } = req.body;
        if (title !== undefined) item.title = title;
        if (description !== undefined) item.description = description;
        if (category !== undefined) item.category = category;
        if (projectUrl !== undefined) item.link = projectUrl;
        if (tags !== undefined) item.skills = tags.split(',').map(tag => tag.trim()).filter(Boolean);
        if (skills !== undefined) item.skills = Array.isArray(skills) ? skills : [];
        if (project !== undefined) item.project = project;
        const updatedItem = await item.save();

        res.json(updatedItem);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Delete portfolio item
// @route   DELETE /api/portfolio/:id
// @access  Private (Owner only)
export const deletePortfolioItem = async (req, res) => {
    try {
        const item = await Portfolio.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }

        // Check ownership
        if (item.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await item.deleteOne();
        res.json({ message: 'Portfolio item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Toggle featured status
// @route   PUT /api/portfolio/:id/feature
// @access  Private (Owner only)
export const toggleFeatured = async (req, res) => {
    try {
        const item = await Portfolio.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }

        // Check ownership
        if (item.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        item.featured = !item.featured;
        await item.save();

        res.json(item);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Like portfolio item
// @route   PUT /api/portfolio/:id/like
// @access  Private
export const likePortfolioItem = async (req, res) => {
    try {
        const item = await Portfolio.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Portfolio item not found' });
        }

        const alreadyLiked = item.likedBy.some(id => id.toString() === req.user._id.toString());
        if (alreadyLiked) {
            return res.status(400).json({ message: 'You have already liked this portfolio item' });
        }

        item.likedBy.push(req.user._id);
        item.likes = item.likedBy.length;
        await item.save();

        res.json(item);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get my portfolio
// @route   GET /api/portfolio/my
// @access  Private
export const getMyPortfolio = async (req, res) => {
    try {
        const portfolio = await Portfolio.find({ user: req.user._id })
            .populate('project', 'title status')
            .sort({ featured: -1, createdAt: -1 });

        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Browse all portfolios
// @route   GET /api/portfolio
// @access  Public
export const browsePortfolios = async (req, res) => {
    try {
        const { category, search, page = 1, limit = 12 } = req.query;
        const query = {};

        if (category) query.category = category;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { skills: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        const portfolios = await Portfolio.find(query)
            .populate('user', 'username profile.avatar reputation')
            .sort({ likes: -1, views: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Portfolio.countDocuments(query);

        res.json({
            portfolios,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            total: count
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
