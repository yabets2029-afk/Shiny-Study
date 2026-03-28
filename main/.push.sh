git add .
git commit -m "Commited"
git push origin main
if [ $? -eq 0 ]; then
    echo "Pushed to main branch successfully!"
else
    echo "No changes to commit."
fi