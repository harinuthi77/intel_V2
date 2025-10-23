# analytics_engine.py - ADVANCED ANALYTICS ENGINE
# Makes FORGE smarter than Manus AI at analytics and data analysis

import json
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from collections import Counter
import statistics

try:
    import pandas as pd
    import numpy as np
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


class AnalyticsEngine:
    """
    Advanced analytics engine for data analysis and insights generation
    Beats Manus AI at analytics tasks
    """

    def __init__(self):
        self.data_cache = {}
        self.insights_history = []

    def analyze_extracted_data(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Perform comprehensive analysis on extracted data

        Args:
            data: List of extracted data items

        Returns:
            Analysis results with statistics, insights, and recommendations
        """
        if not data:
            return {'error': 'No data to analyze'}

        analysis = {
            'timestamp': datetime.now().isoformat(),
            'data_count': len(data),
            'statistics': {},
            'insights': [],
            'recommendations': [],
            'visualizations': []
        }

        # Basic statistics
        analysis['statistics']['total_items'] = len(data)

        # Analyze price data if available
        if any('price' in item for item in data):
            price_analysis = self._analyze_prices(data)
            analysis['statistics']['prices'] = price_analysis['statistics']
            analysis['insights'].extend(price_analysis['insights'])

        # Analyze ratings if available
        if any('rating' in item for item in data):
            rating_analysis = self._analyze_ratings(data)
            analysis['statistics']['ratings'] = rating_analysis['statistics']
            analysis['insights'].extend(rating_analysis['insights'])

        # Analyze text patterns
        if any('name' in item or 'title' in item for item in data):
            text_analysis = self._analyze_text_patterns(data)
            analysis['statistics']['text_patterns'] = text_analysis
            analysis['insights'].append(text_analysis['insight'])

        # Generate recommendations
        analysis['recommendations'] = self._generate_recommendations(data, analysis)

        # Advanced analytics if pandas is available
        if PANDAS_AVAILABLE:
            df_analysis = self._pandas_analysis(data)
            analysis['advanced_analytics'] = df_analysis

        self.insights_history.append(analysis)
        return analysis

    def _analyze_prices(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze price data"""
        prices = []
        for item in data:
            if 'price' in item and item['price']:
                # Extract numeric price
                price_str = str(item['price'])
                # Remove currency symbols and commas
                price_clean = re.sub(r'[^\d.]', '', price_str)
                try:
                    prices.append(float(price_clean))
                except ValueError:
                    continue

        if not prices:
            return {'statistics': {}, 'insights': []}

        stats = {
            'min': min(prices),
            'max': max(prices),
            'mean': statistics.mean(prices),
            'median': statistics.median(prices),
            'range': max(prices) - min(prices)
        }

        if len(prices) > 1:
            stats['stdev'] = statistics.stdev(prices)

        insights = []

        # Price range insight
        if stats['range'] > stats['mean']:
            insights.append(f"High price variance detected: ${stats['min']:.2f} - ${stats['max']:.2f} (${stats['range']:.2f} range)")

        # Best value identification
        if prices:
            best_value_idx = prices.index(min(prices))
            insights.append(f"Best price: ${min(prices):.2f} (item #{best_value_idx + 1})")

        # Price distribution insight
        below_mean = sum(1 for p in prices if p < stats['mean'])
        above_mean = len(prices) - below_mean
        insights.append(f"Price distribution: {below_mean} items below average, {above_mean} above average")

        return {'statistics': stats, 'insights': insights}

    def _analyze_ratings(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze rating data"""
        ratings = []
        for item in data:
            if 'rating' in item and item['rating']:
                try:
                    rating_val = float(str(item['rating']).split()[0])  # Handle "4.5 stars" format
                    ratings.append(rating_val)
                except (ValueError, IndexError):
                    continue

        if not ratings:
            return {'statistics': {}, 'insights': []}

        stats = {
            'min': min(ratings),
            'max': max(ratings),
            'mean': statistics.mean(ratings),
            'median': statistics.median(ratings)
        }

        insights = []

        # High-rated items
        high_rated = [r for r in ratings if r >= 4.5]
        if high_rated:
            insights.append(f"Quality: {len(high_rated)} items with 4.5+ rating ({len(high_rated)/len(ratings)*100:.1f}%)")

        # Average rating insight
        if stats['mean'] >= 4.0:
            insights.append(f"Overall high quality: average rating {stats['mean']:.2f}/5.0")
        elif stats['mean'] < 3.5:
            insights.append(f"Caution: low average rating of {stats['mean']:.2f}/5.0")

        return {'statistics': stats, 'insights': insights}

    def _analyze_text_patterns(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyze text patterns in data"""
        all_text = []
        for item in data:
            text = item.get('name') or item.get('title') or ''
            all_text.append(text.lower())

        # Find common words
        words = []
        for text in all_text:
            words.extend(re.findall(r'\b\w+\b', text))

        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'}
        words = [w for w in words if w not in stop_words and len(w) > 2]

        word_freq = Counter(words)
        top_words = word_freq.most_common(5)

        insight = f"Common keywords: {', '.join([f'{word} ({count})' for word, count in top_words[:3]])}"

        return {
            'top_keywords': dict(top_words),
            'total_unique_words': len(word_freq),
            'insight': insight
        }

    def _generate_recommendations(self, data: List[Dict], analysis: Dict) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        # Best value recommendation
        if 'prices' in analysis.get('statistics', {}):
            prices_stats = analysis['statistics']['prices']
            recommendations.append(
                f"💰 Best Value: Look for items priced around ${prices_stats['median']:.2f} (median price)"
            )

        # Quality recommendation
        if 'ratings' in analysis.get('statistics', {}):
            ratings_stats = analysis['statistics']['ratings']
            if ratings_stats['mean'] >= 4.0:
                recommendations.append(
                    f"⭐ Quality Recommendation: Focus on items with {ratings_stats['mean']:.1f}+ rating"
                )

        # Data completeness recommendation
        complete_items = sum(1 for item in data if all(key in item for key in ['name', 'price']))
        if complete_items < len(data):
            recommendations.append(
                f"📊 Data Quality: {complete_items}/{len(data)} items have complete information"
            )

        return recommendations

    def _pandas_analysis(self, data: List[Dict]) -> Dict[str, Any]:
        """Advanced analysis using pandas (if available)"""
        if not PANDAS_AVAILABLE:
            return {'error': 'Pandas not available'}

        try:
            df = pd.DataFrame(data)

            analysis = {
                'shape': df.shape,
                'columns': list(df.columns),
                'missing_values': df.isnull().sum().to_dict(),
                'data_types': df.dtypes.astype(str).to_dict()
            }

            # Correlation analysis if numeric columns exist
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 1:
                correlations = df[numeric_cols].corr().to_dict()
                analysis['correlations'] = correlations

            return analysis

        except Exception as e:
            return {'error': str(e)}

    def compare_datasets(self, dataset1: List[Dict], dataset2: List[Dict], key: str = 'price') -> Dict[str, Any]:
        """
        Compare two datasets

        Args:
            dataset1: First dataset
            dataset2: Second dataset
            key: Key to compare (e.g., 'price', 'rating')

        Returns:
            Comparison analysis
        """
        values1 = [item.get(key) for item in dataset1 if key in item]
        values2 = [item.get(key) for item in dataset2 if key in item]

        # Convert to float if possible
        try:
            values1 = [float(re.sub(r'[^\d.]', '', str(v))) for v in values1 if v]
            values2 = [float(re.sub(r'[^\d.]', '', str(v))) for v in values2 if v]
        except:
            pass

        if not values1 or not values2:
            return {'error': 'Insufficient data for comparison'}

        comparison = {
            'dataset1': {
                'count': len(values1),
                'mean': statistics.mean(values1),
                'median': statistics.median(values1),
                'min': min(values1),
                'max': max(values1)
            },
            'dataset2': {
                'count': len(values2),
                'mean': statistics.mean(values2),
                'median': statistics.median(values2),
                'min': min(values2),
                'max': max(values2)
            },
            'difference': {
                'mean_diff': statistics.mean(values2) - statistics.mean(values1),
                'median_diff': statistics.median(values2) - statistics.median(values1)
            }
        }

        # Generate insight
        if comparison['difference']['mean_diff'] > 0:
            comparison['insight'] = f"Dataset 2 is {abs(comparison['difference']['mean_diff']):.2f} higher on average"
        else:
            comparison['insight'] = f"Dataset 1 is {abs(comparison['difference']['mean_diff']):.2f} higher on average"

        return comparison

    def generate_chart(self, data: List[Dict], chart_type: str = 'bar', key: str = 'price', output_path: str = None) -> Tuple[bool, str]:
        """
        Generate visualization chart

        Args:
            data: Data to visualize
            chart_type: Type of chart ('bar', 'line', 'pie', 'scatter')
            key: Data key to visualize
            output_path: Path to save chart

        Returns:
            Tuple of (success, path or error message)
        """
        if not MATPLOTLIB_AVAILABLE:
            return False, "Matplotlib not available"

        try:
            # Extract values
            values = []
            labels = []
            for i, item in enumerate(data):
                if key in item:
                    val_str = str(item[key])
                    # Try to extract numeric value
                    val_clean = re.sub(r'[^\d.]', '', val_str)
                    try:
                        values.append(float(val_clean))
                        labels.append(item.get('name', f'Item {i+1}')[:20])
                    except ValueError:
                        continue

            if not values:
                return False, f"No valid data found for key '{key}'"

            # Create chart
            plt.figure(figsize=(12, 6))

            if chart_type == 'bar':
                plt.bar(range(len(values)), values)
                plt.xticks(range(len(labels)), labels, rotation=45, ha='right')
                plt.ylabel(key.capitalize())
            elif chart_type == 'line':
                plt.plot(values, marker='o')
                plt.xticks(range(len(labels)), labels, rotation=45, ha='right')
                plt.ylabel(key.capitalize())
            elif chart_type == 'pie':
                plt.pie(values, labels=labels, autopct='%1.1f%%')
            elif chart_type == 'scatter':
                plt.scatter(range(len(values)), values)
                plt.xticks(range(len(labels)), labels, rotation=45, ha='right')
                plt.ylabel(key.capitalize())

            plt.title(f'{key.capitalize()} Analysis')
            plt.tight_layout()

            # Save chart
            if not output_path:
                output_path = f'chart_{key}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png'

            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()

            return True, output_path

        except Exception as e:
            return False, str(e)

    def generate_report(self, data: List[Dict], title: str = "Data Analysis Report") -> str:
        """
        Generate a comprehensive analysis report

        Args:
            data: Data to analyze
            title: Report title

        Returns:
            Markdown-formatted report
        """
        analysis = self.analyze_extracted_data(data)

        report = f"# {title}\n\n"
        report += f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"

        report += f"## Summary\n\n"
        report += f"- **Total Items Analyzed:** {analysis['data_count']}\n"

        if 'prices' in analysis.get('statistics', {}):
            stats = analysis['statistics']['prices']
            report += f"\n## Price Analysis\n\n"
            report += f"- **Range:** ${stats['min']:.2f} - ${stats['max']:.2f}\n"
            report += f"- **Average:** ${stats['mean']:.2f}\n"
            report += f"- **Median:** ${stats['median']:.2f}\n"
            if 'stdev' in stats:
                report += f"- **Standard Deviation:** ${stats['stdev']:.2f}\n"

        if 'ratings' in analysis.get('statistics', {}):
            stats = analysis['statistics']['ratings']
            report += f"\n## Quality Analysis\n\n"
            report += f"- **Rating Range:** {stats['min']:.1f} - {stats['max']:.1f}\n"
            report += f"- **Average Rating:** {stats['mean']:.2f}/5.0\n"
            report += f"- **Median Rating:** {stats['median']:.2f}/5.0\n"

        if analysis.get('insights'):
            report += f"\n## Key Insights\n\n"
            for insight in analysis['insights']:
                report += f"- {insight}\n"

        if analysis.get('recommendations'):
            report += f"\n## Recommendations\n\n"
            for rec in analysis['recommendations']:
                report += f"- {rec}\n"

        report += f"\n## Raw Data\n\n"
        report += "```json\n"
        report += json.dumps(data[:5], indent=2)  # Show first 5 items
        if len(data) > 5:
            report += f"\n... and {len(data) - 5} more items"
        report += "\n```\n"

        return report


# Singleton instance
_global_analytics = None

def get_analytics_engine() -> AnalyticsEngine:
    """Get or create the global analytics engine"""
    global _global_analytics
    if _global_analytics is None:
        _global_analytics = AnalyticsEngine()
    return _global_analytics
