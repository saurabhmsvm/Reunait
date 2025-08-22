export const logoutUser = async (req, res) => {
    try {
        return res.status(200).json({
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            message: 'Error during logout',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};